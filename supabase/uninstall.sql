-- =====================================================================
--  Construction Store Register : REMOVE everything it added
--
--  Removes ONLY the schema "cstore" (its tables, functions and the photo-bucket
--  policy). Nothing of yours is touched. The records inside the cstore tables
--  are deleted for good, so export what you need first (Table Editor -> Export CSV).
--
--  Afterwards, in the dashboard: Storage -> delete the bucket "cstore-photos"
--  (empty it first), and take "cstore" out of Project Settings -> API -> Exposed schemas.
-- =====================================================================

begin;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cstore')
     and obj_description((select oid from pg_namespace where nspname = 'cstore'), 'pg_namespace') is distinct from 'cstore v1' then
    raise exception 'The schema "cstore" is not one of ours. Nothing was removed.';
  end if;
end $$;

drop policy if exists "cstore photos admin write" on storage.objects;

drop table if exists cstore.issues;
drop table if exists cstore.receives;
drop table if exists cstore.products;
drop table if exists cstore.departments;
drop table if exists cstore.projects;
drop table if exists cstore.settings;

drop function if exists cstore.after_move();
drop function if exists cstore.issues_before();
drop function if exists cstore.receives_before();
drop function if exists cstore.products_guard();
drop function if exists cstore.recompute(uuid);
drop function if exists cstore.issued(uuid, uuid);
drop function if exists cstore.received(uuid, uuid);
drop function if exists cstore.is_admin();

-- No CASCADE on purpose: if anything unknown is still inside, this stops instead of deleting it.
drop schema if exists cstore;

notify pgrst, 'reload schema';

commit;
