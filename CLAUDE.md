# CLAUDE.md — Construction Company Inventory System

## 1. Project Overview
A website for a **civil engineering / construction company** to track construction material (saman).
The company runs many projects, and every project has its own manager. Only ONE person (the admin) can use the system.

The site answers three questions:
1. **Receive** — what material came in, how much, from whom, when?
2. **Issue** — which material was given to which project / department, how much, when?
3. **Total Products** — what material do we have right now and in what quantity?

Stack: **React (Vite) + Supabase** (Postgres database, Auth, Storage). Nothing else: no SQLite, no custom server, no JSON data file.

---

## 2. CRITICAL RULES
1. **Supabase is the only backend.** Never add another database, server, or data file.
2. **The Supabase project already exists and has other data.** Every change to it must be **add-only**:
   - All our tables, functions and triggers live in their **own Postgres schema `cstore`**. Never create anything in `public`. The photo bucket is `cstore-photos`.
   - Never drop, rename, alter or delete anything that is not inside `cstore` (or the one `cstore photos admin write` storage policy). Never change project-wide settings. The ONLY manual setting is adding `cstore` to API → Exposed schemas.
   - `supabase/setup.sql` (the ONE setup file: schema + example records) must stay: one transaction, safe to re-run (`if not exists`, `create or replace`, `drop ... if exists` only on our own objects), and it must refuse to run if a schema `cstore` exists that it did not create (schema comment `cstore v1`).
   - `supabase/uninstall.sql` removes only `cstore` (no CASCADE) and refuses a `cstore` schema that isn't ours.
   - Schema changes later = new additive SQL (e.g. `alter table cstore.x add column if not exists ...`), never a rewrite.
3. **Only the admin can read or change data.** RLS is on every `cstore` table with the policy `admin only`, using `cstore.is_admin()` (admin email is stored in `cstore.settings`, changed only from the SQL editor). `anon` has no access and no schema usage. Never put the `service_role` key in the app.
4. **Stock rules live in the database (triggers), not in the browser:**
   - `cstore.products.quantity` can't be typed; it always equals received − issued.
   - An issue can't exceed stock (message: `Only 70 bag available in stock`). A receipt can't be edited or deleted if that would make stock negative. Concurrent issues are serialized with a row lock.
   - Products, projects and departments used by other records can't be deleted. Deleting a project deletes its departments.
5. **Photos** go to Supabase Storage bucket `cstore-photos` (public read, admin write, 1 MB max). The product keeps only the public URL. Replacing or deleting a photo removes the old file (best effort).
6. **Full CRUD + filter + search** for every table, on the main pages and on the Database page. No hard-coded records in the UI.
7. The main pages and the Database page use the **same forms** (`src/components/forms/`) and the **same data layer** (`src/lib/dbApi.js` + `src/lib/inventory.js`).
8. The client is created with `db: { schema: 'cstore' }` (`src/lib/supabase.js`). If the schema isn't exposed or setup wasn't run, `setupProblem()` turns the error into a plain instruction.
9. Never commit `.env`. Only the anon key goes in the app.

---

## 3. Folder Structure
```
construction-inventory/
├── CLAUDE.md, README.md, vercel.json, .env.example
├── public/_redirects                 # Netlify / Cloudflare Pages SPA fallback
├── supabase/
│   ├── setup.sql                     # ONE file: add-only setup (schema cstore, tables, rules, security, photo bucket) + example records (only if empty)
│   └── uninstall.sql                 # removes only what setup.sql added
├── database/page/                    # The Database page: all tables on one page
│   └── DatabasePage.jsx, TableTabs.jsx, ProductCardGrid.jsx
└── src/
    ├── lib/ supabase.js, dbApi.js, inventory.js, enrich.js, format.js, schema.js, image.js
    ├── auth/                         # Login (email + password), AuthContext (checks cstore.is_admin), ProtectedRoute
    ├── context/                      # Data (loads all tables), Feedback (toasts + confirm)
    ├── components/                   # Layout, FilterBar, RecordTable, ProductCard, Modal...
    │   └── forms/                    # Product, Receive, Issue, Project, Department forms
    └── pages/                        # Receive, Issue, TotalProducts, Projects
```

## 4. Data (schema `cstore`)
- `cstore.projects` (id, name, manager_name) · `cstore.departments` (id, name, project_id; null project = common to all projects)
- `cstore.products` (id, name, image_url, quantity, quality, unit, category, notes)
- `cstore.receives` (id, product_id, quantity > 0, supplier, received_date, note)
- `cstore.issues` (id, product_id, project_id, department_id, quantity > 0, issued_to, issue_date, note)
- `cstore.settings` (key, value) — admin email; not readable from the app.
- All have `created_at`. IDs are UUIDs generated by Postgres. Names/units can't be empty (check constraints).
- `dbApi.js` reads with PostgREST embeds (names of product/project/department come with each row), pages through results (Supabase returns max 1000 rows per request), and turns database errors into plain sentences.

## 5. Main App
- **Receive / Issue:** form + table with search, date filter, edit, delete (Issue also filters by project and department; choosing a project shows its manager and its departments plus common ones).
- **Total Products:** cards with photo, name, quality, quantity, received/issued; search, quality filter, low-stock filter (`VITE_LOW_STOCK_LEVEL`, default 10); add (with opening stock = first receipt) / edit / delete.
- **Projects:** each project has a manager and departments.
- **Database page:** tabs for every table, CRUD, search, filters.
- Colors: Receive = green, Issue = brick red, Total Products = steel blue, Database = amber-brown. Fonts: Barlow Condensed + Barlow.

## 6. Commands
```
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
```
Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_COMPANY_NAME`, `VITE_LOW_STOCK_LEVEL`.
Publish: GitHub → Vercel / Netlify / Cloudflare Pages (build `npm run build`, output `dist`, add the env vars).

## 7. Coding Rules
- React function components + hooks. Plain CSS in `src/styles.css`.
- All data access goes through `src/lib/dbApi.js`. Business rules go in the database triggers, not in components.
- Validate forms. Keep components small. Ask the owner before adding a table, column or package.
