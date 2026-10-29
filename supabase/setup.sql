-- =====================================================================
--  Construction Store Register : Supabase setup  (ONE file, run it once)
--
--  EVERYTHING GOES INTO ITS OWN SCHEMA NAMED  cstore  (think: a separate
--  folder inside your database). Nothing is created in your "public" schema.
--
--  This script is ADD-ONLY and safe to run in a project that already has data:
--   * It never drops, renames or edits any existing table, column, row,
--     function, policy, trigger or setting of yours.
--   * It runs as ONE transaction. If anything fails, nothing is changed.
--   * It is safe to run again: whatever is already there is left as it is.
--   * If a schema called "cstore" already exists and was NOT created by this
--     script, it stops before changing anything.
--
--  It also loads a few example records (8 products, 5 projects, 7 issues).
--  They are added ONLY if the cstore tables are completely empty, so running
--  the file again never adds them on top of your own records.
--  Do not want the examples? Delete the block marked "6)" before running.
--
--  BEFORE YOU RUN IT: change the admin email on the line marked  <-- CHANGE.
--  That Supabase Auth user is the only person who can see or change the data.
--  (Create the user in Authentication -> Users if it does not exist yet.)
--
--  AFTER YOU RUN IT (one click, once): Supabase dashboard -> Project Settings
--  -> API -> "Exposed schemas" -> add  cstore  -> Save.
--  (Keep everything that is already in that list.)
-- =====================================================================

begin;

-- 0) Safety check ------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cstore')
     and obj_description((select oid from pg_namespace where nspname = 'cstore'), 'pg_namespace') is distinct from 'cstore v1' then
    raise exception 'A schema named "cstore" already exists and was not created by this script. Nothing was changed.';
  end if;
end $$;

-- 1) The schema + who is the admin --------------------------------------
create schema if not exists cstore;
comment on schema cstore is 'cstore v1';
grant usage on schema cstore to authenticated;      -- not to anon: signed-out visitors cannot even look inside

create table if not exists cstore.settings (
  key   text primary key,
  value text not null
);

insert into cstore.settings (key, value)
values ('admin_email', 'admin@yourcompany.com')          -- <-- CHANGE this to the admin's email
on conflict (key) do nothing;

create or replace function cstore.is_admin()
returns boolean
language sql stable security definer
set search_path = cstore, pg_temp
as $$
  select exists (
    select 1 from cstore.settings s
    where s.key = 'admin_email'
      and lower(s.value) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;
revoke all on function cstore.is_admin() from public;
grant execute on function cstore.is_admin() to authenticated;

-- 2) Tables ------------------------------------------------------------
create table if not exists cstore.projects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (btrim(name) <> ''),
  manager_name text not null check (btrim(manager_name) <> ''),
  created_at   timestamptz not null default now()
);

create table if not exists cstore.departments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (btrim(name) <> ''),
  project_id uuid references cstore.projects(id) on delete cascade,   -- empty = common to all projects
  created_at timestamptz not null default now()
);

create table if not exists cstore.products (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (btrim(name) <> ''),
  image_url  text,                                   -- the photo itself is in the cstore-photos bucket
  quantity   numeric not null default 0 check (quantity >= 0),   -- kept by the database: received - issued
  quality    text,
  unit       text not null check (btrim(unit) <> ''),
  category   text,
  notes      text,
  created_at timestamptz not null default now()
);

create table if not exists cstore.receives (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references cstore.products(id) on delete restrict,
  quantity      numeric not null check (quantity > 0),
  supplier      text,
  received_date date not null default current_date,
  note          text,
  created_at    timestamptz not null default now()
);

create table if not exists cstore.issues (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references cstore.products(id) on delete restrict,
  project_id    uuid references cstore.projects(id),
  department_id uuid references cstore.departments(id),
  quantity      numeric not null check (quantity > 0),
  issued_to     text,
  issue_date    date not null default current_date,
  note          text,
  created_at    timestamptz not null default now()
);

create index if not exists departments_project_idx on cstore.departments(project_id);
create index if not exists receives_product_idx    on cstore.receives(product_id);
create index if not exists receives_date_idx       on cstore.receives(received_date);
create index if not exists issues_product_idx      on cstore.issues(product_id);
create index if not exists issues_project_idx      on cstore.issues(project_id);
create index if not exists issues_department_idx   on cstore.issues(department_id);
create index if not exists issues_date_idx         on cstore.issues(issue_date);

-- 3) Stock rules (inside the database, so nothing can bypass them) -------
create or replace function cstore.received(p uuid, except_id uuid default null)
returns numeric language sql stable set search_path = cstore, pg_temp as $$
  select coalesce(sum(quantity), 0) from cstore.receives where product_id = p and id is distinct from except_id
$$;

create or replace function cstore.issued(p uuid, except_id uuid default null)
returns numeric language sql stable set search_path = cstore, pg_temp as $$
  select coalesce(sum(quantity), 0) from cstore.issues where product_id = p and id is distinct from except_id
$$;

-- Stock = everything received - everything issued
create or replace function cstore.recompute(p uuid)
returns void language plpgsql set search_path = cstore, pg_temp as $$
begin
  perform set_config('cstore.recompute', '1', true);
  update cstore.products
     set quantity = cstore.received(p) - cstore.issued(p)
   where id = p;
  perform set_config('cstore.recompute', '', true);
end $$;

-- Nobody can type a stock number by hand
create or replace function cstore.products_guard()
returns trigger language plpgsql set search_path = cstore, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    new.quantity := 0;
  elsif coalesce(current_setting('cstore.recompute', true), '') <> '1' then
    new.quantity := old.quantity;
  end if;
  return new;
end $$;

create or replace function cstore.receives_before()
returns trigger language plpgsql set search_path = cstore, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    return new;
  end if;
  perform 1 from cstore.products where id = old.product_id for update;
  if tg_op = 'UPDATE' then
    perform 1 from cstore.products where id = new.product_id for update;
    if cstore.received(new.product_id, old.id) + new.quantity < cstore.issued(new.product_id) then
      raise exception 'This material was already issued, so the stock would go below zero';
    end if;
    if old.product_id <> new.product_id and cstore.received(old.product_id, old.id) < cstore.issued(old.product_id) then
      raise exception 'This material was already issued, so the stock would go below zero';
    end if;
    return new;
  end if;
  -- DELETE
  if cstore.received(old.product_id, old.id) < cstore.issued(old.product_id) then
    raise exception 'This material was already issued, so the stock would go below zero';
  end if;
  return old;
end $$;

create or replace function cstore.issues_before()
returns trigger language plpgsql set search_path = cstore, pg_temp as $$
declare
  v_available numeric;
  v_unit text;
begin
  perform 1 from cstore.products where id = new.product_id for update;
  v_available := cstore.received(new.product_id)
               - cstore.issued(new.product_id, case when tg_op = 'UPDATE' then old.id end);
  if new.quantity > v_available then
    select unit into v_unit from cstore.products where id = new.product_id;
    raise exception 'Only % % available in stock', trim_scale(v_available)::text, coalesce(v_unit, '');
  end if;
  return new;
end $$;

create or replace function cstore.after_move()
returns trigger language plpgsql set search_path = cstore, pg_temp as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform cstore.recompute(new.product_id); end if;
  if tg_op in ('UPDATE', 'DELETE') then perform cstore.recompute(old.product_id); end if;
  return null;
end $$;

drop trigger if exists products_guard_trg on cstore.products;
create trigger products_guard_trg before insert or update on cstore.products
  for each row execute function cstore.products_guard();

drop trigger if exists receives_before_trg on cstore.receives;
create trigger receives_before_trg before insert or update or delete on cstore.receives
  for each row execute function cstore.receives_before();

drop trigger if exists issues_before_trg on cstore.issues;
create trigger issues_before_trg before insert or update on cstore.issues
  for each row execute function cstore.issues_before();

drop trigger if exists receives_after_trg on cstore.receives;
create trigger receives_after_trg after insert or update or delete on cstore.receives
  for each row execute function cstore.after_move();

drop trigger if exists issues_after_trg on cstore.issues;
create trigger issues_after_trg after insert or update or delete on cstore.issues
  for each row execute function cstore.after_move();

-- 4) Who can see / change the data: the admin only ----------------------
do $$
declare
  t text;
begin
  foreach t in array array['settings','projects','departments','products','receives','issues'] loop
    execute format('alter table cstore.%I enable row level security', t);
    execute format('revoke all on cstore.%I from anon', t);
    if t = 'settings' then
      execute format('revoke all on cstore.%I from authenticated', t);   -- change it only from the SQL editor
    else
      execute format('grant select, insert, update, delete on cstore.%I to authenticated', t);
      execute format('drop policy if exists "admin only" on cstore.%I', t);
      execute format('create policy "admin only" on cstore.%I for all to authenticated using (cstore.is_admin()) with check (cstore.is_admin())', t);
    end if;
  end loop;
end $$;

-- 5) Product photos: their own bucket ---------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cstore-photos', 'cstore-photos', true, 1048576, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

drop policy if exists "cstore photos admin write" on storage.objects;
create policy "cstore photos admin write" on storage.objects
  for all to authenticated
  using (bucket_id = 'cstore-photos' and cstore.is_admin())
  with check (bucket_id = 'cstore-photos' and cstore.is_admin());

notify pgrst, 'reload schema';

-- 6) Example records (only when the cstore tables are empty) -------------
do $$
begin
  if not exists (select 1 from cstore.projects)
     and not exists (select 1 from cstore.departments)
     and not exists (select 1 from cstore.products)
     and not exists (select 1 from cstore.receives)
     and not exists (select 1 from cstore.issues) then
    insert into cstore.projects (id, name, manager_name) values
      ('8bb0d11e-6945-44d2-8850-049cc5a3d0db', 'Metro Bridge', 'Ali Raza'),
      ('a75dd562-5159-4be2-849d-99e11f68115f', 'Green Valley Housing', 'Usman Tariq'),
      ('af319902-64ff-4b93-86df-373298cfc7ac', 'City Mall Tower', 'Bilal Ahmed'),
      ('53ca9176-edb1-4e68-8f70-68145dd5d689', 'Highway Link Road', 'Kashif Mehmood'),
      ('a144af0e-bdc4-4724-ad06-655f3f65d423', 'Government School Block', 'Sana Iqbal')
    on conflict (id) do nothing;

    insert into cstore.departments (id, name, project_id) values
      ('46fcf1ab-af76-40cd-9cd8-7bb98ab3a572', 'Steel Fixing', '8bb0d11e-6945-44d2-8850-049cc5a3d0db'),
      ('4f46dfda-9f37-44f4-bf96-86f31e5706b2', 'Concrete Work', '8bb0d11e-6945-44d2-8850-049cc5a3d0db'),
      ('9d65e403-ae7e-4da4-9925-0e2ab454fb1b', 'Shuttering', '8bb0d11e-6945-44d2-8850-049cc5a3d0db'),
      ('3b4724b2-d2c8-43f5-a079-58ea1c051286', 'Foundation', 'a75dd562-5159-4be2-849d-99e11f68115f'),
      ('98d3e051-6066-46f2-b066-9faa7b92a726', 'Brick Masonry', 'a75dd562-5159-4be2-849d-99e11f68115f'),
      ('e6d2bda3-d991-401a-b86b-21ee2255fa83', 'Plumbing', 'a75dd562-5159-4be2-849d-99e11f68115f'),
      ('671d4ffe-1060-47b3-a0c9-7fd94eb22369', 'Electrical', 'a75dd562-5159-4be2-849d-99e11f68115f'),
      ('7a0f3c06-3510-4348-b04f-9b4664c2d6fb', 'Structure', 'af319902-64ff-4b93-86df-373298cfc7ac'),
      ('4a7fce1f-018e-4166-8165-e64d1e40f5e6', 'Finishing', 'af319902-64ff-4b93-86df-373298cfc7ac'),
      ('74901396-4c7d-42be-90cf-f0da9523d55f', 'Plumbing', 'af319902-64ff-4b93-86df-373298cfc7ac'),
      ('725bbf89-bf6a-4061-b1c7-522beff68ffc', 'Electrical', 'af319902-64ff-4b93-86df-373298cfc7ac'),
      ('687a86c2-66b5-4454-9667-0d32e69dc66e', 'Earthwork', '53ca9176-edb1-4e68-8f70-68145dd5d689'),
      ('d967ddf9-aeba-4e3a-a2f8-d31a7175957a', 'Asphalt Laying', '53ca9176-edb1-4e68-8f70-68145dd5d689'),
      ('bd7d8b76-1362-469f-8338-cd0adc205f22', 'Drainage', '53ca9176-edb1-4e68-8f70-68145dd5d689'),
      ('fcb1a57e-6030-4e42-ba60-2e1e62af5b35', 'Survey', '53ca9176-edb1-4e68-8f70-68145dd5d689'),
      ('f297eaf2-00cf-4d2b-a07c-376f94c94165', 'Foundation', 'a144af0e-bdc4-4724-ad06-655f3f65d423'),
      ('53a3cbdf-47c6-4932-99a3-176c55eb014f', 'Brick Masonry', 'a144af0e-bdc4-4724-ad06-655f3f65d423'),
      ('12823b92-1b86-4ca6-a614-a2af337706bf', 'Roofing', 'a144af0e-bdc4-4724-ad06-655f3f65d423'),
      ('f4a9b569-8a83-4ddf-9f61-f374b4bbcb30', 'Painting', 'a144af0e-bdc4-4724-ad06-655f3f65d423'),
      ('855bac50-cd2b-4817-90b7-1962d1b7ab79', 'Store', null),
      ('f1a1454e-78f9-4ab1-9409-3c7a54aa092e', 'Maintenance', null),
      ('f25745f6-5e61-4bb4-9970-73a6f1809bbd', 'Safety', null)
    on conflict (id) do nothing;

    insert into cstore.products (id, name, quality, unit, category, notes) values
      ('688b655c-2d02-4247-9c4d-fb8c46117121', 'Portland Cement 50kg', 'Grade A', 'bag', 'Cement', 'OPC, 50 kg bag'),
      ('715f40fc-5283-491e-8c91-6ead8d5c67c7', 'Steel Bar 12mm', 'Grade A', 'ton', 'Steel', 'Deformed bar, Grade 60'),
      ('b1a9aafc-8808-4c0d-9d7f-32d276fb526e', 'Crush Stone (Bajri)', 'Grade B', 'cubic feet', 'Aggregate', '3/4 inch size'),
      ('47bd3d87-d712-4e95-b6ee-8e4b1e0d7a07', 'River Sand (Ret)', 'Grade B', 'cubic feet', 'Aggregate', 'Washed sand'),
      ('99bd9d6f-85d0-4fc8-b708-4866f125d58b', 'Red Clay Brick', 'Grade C', 'piece', 'Masonry', 'First class brick'),
      ('02db6164-5f58-4ebf-b386-b73df1043e5b', 'PVC Pipe 4 inch', 'Grade A', 'piece', 'Plumbing', '10 feet length'),
      ('a9b3aa99-c4a9-4002-8ff9-606fd80d2849', 'Binding Wire', 'Grade B', 'kg', 'Steel', '18 gauge'),
      ('6476ddaf-7b0a-4c9d-a85b-f06202e0fda9', 'Wall Paint White', 'Grade A', 'liter', 'Finishing', 'Weather shield, 20 L drums')
    on conflict (id) do nothing;

    insert into cstore.receives (id, product_id, quantity, supplier, received_date, note) values
      ('0410afb5-21a8-4704-8682-b631d0936e68', '688b655c-2d02-4247-9c4d-fb8c46117121', 500, 'Opening stock', '2026-10-01', null),
      ('e5b79081-6c0e-444b-821a-818c9654cd8f', '715f40fc-5283-491e-8c91-6ead8d5c67c7', 15, 'Opening stock', '2026-10-01', null),
      ('a342cfd4-a2e9-4c43-86da-48f90fa726db', 'b1a9aafc-8808-4c0d-9d7f-32d276fb526e', 2000, 'Opening stock', '2026-10-01', null),
      ('1c367a2e-cff6-478a-8272-f7d9e5708d45', '47bd3d87-d712-4e95-b6ee-8e4b1e0d7a07', 3000, 'Opening stock', '2026-10-01', null),
      ('4a08eae9-e025-49a7-8dd8-e5ec19bd3003', '99bd9d6f-85d0-4fc8-b708-4866f125d58b', 20000, 'Opening stock', '2026-10-01', null),
      ('d74da0a9-f34c-4152-a979-72d24ca379eb', '02db6164-5f58-4ebf-b386-b73df1043e5b', 120, 'Opening stock', '2026-10-01', null),
      ('9398adb6-7348-415a-a131-97555d93402b', 'a9b3aa99-c4a9-4002-8ff9-606fd80d2849', 250, 'Opening stock', '2026-10-01', null),
      ('5e2fee0c-5ec7-461d-8f75-4a78c241610c', '6476ddaf-7b0a-4c9d-a85b-f06202e0fda9', 80, 'Opening stock', '2026-10-01', null)
    on conflict (id) do nothing;

    insert into cstore.issues (id, product_id, project_id, department_id, quantity, issued_to, issue_date, note) values
      ('53ad3de2-9b87-4360-a815-740519eb8449', '688b655c-2d02-4247-9c4d-fb8c46117121', '8bb0d11e-6945-44d2-8850-049cc5a3d0db', '4f46dfda-9f37-44f4-bf96-86f31e5706b2', 120, 'Imran', '2026-10-05', 'Column casting'),
      ('89f9adb5-e9bf-4cd5-b2ee-34c02f2b5bb4', '715f40fc-5283-491e-8c91-6ead8d5c67c7', '8bb0d11e-6945-44d2-8850-049cc5a3d0db', '46fcf1ab-af76-40cd-9cd8-7bb98ab3a572', 4, 'Rashid', '2026-10-06', 'Raft reinforcement'),
      ('20c2218e-0bad-4969-9d55-e745e4ea80dc', '99bd9d6f-85d0-4fc8-b708-4866f125d58b', 'a75dd562-5159-4be2-849d-99e11f68115f', '98d3e051-6066-46f2-b066-9faa7b92a726', 5000, 'Farhan', '2026-10-08', 'Boundary wall'),
      ('0d5fd5ca-eb7a-4cc2-a002-550153c4dc35', '02db6164-5f58-4ebf-b386-b73df1043e5b', 'af319902-64ff-4b93-86df-373298cfc7ac', '74901396-4c7d-42be-90cf-f0da9523d55f', 40, 'Zubair', '2026-10-10', 'Drainage line'),
      ('7b4fb394-f455-45c4-b2d0-b204525786b7', '6476ddaf-7b0a-4c9d-a85b-f06202e0fda9', 'a144af0e-bdc4-4724-ad06-655f3f65d423', 'f4a9b569-8a83-4ddf-9f61-f374b4bbcb30', 25, 'Naveed', '2026-10-12', 'Classroom walls'),
      ('9ed979c2-5b0f-408f-883b-09725d1443ec', 'b1a9aafc-8808-4c0d-9d7f-32d276fb526e', '53ca9176-edb1-4e68-8f70-68145dd5d689', '687a86c2-66b5-4454-9667-0d32e69dc66e', 600, 'Adnan', '2026-10-14', 'Road base'),
      ('eb992eea-0540-4ecd-945e-8bbbb9be7b7a', '688b655c-2d02-4247-9c4d-fb8c46117121', 'af319902-64ff-4b93-86df-373298cfc7ac', '855bac50-cd2b-4817-90b7-1962d1b7ab79', 50, 'Hamid', '2026-10-15', 'Site store stock')
    on conflict (id) do nothing;
  end if;
end $$;

commit;
