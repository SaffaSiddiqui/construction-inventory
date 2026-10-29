// All reading and writing of records goes through this one object.
// It talks to Supabase. The stock rules run inside the Supabase database itself.
import { supabase, setupProblem } from './supabase'
import { LOW_STOCK_LEVEL } from './schema'

const NAME = (table) => table // the tables live in the cstore schema (set in supabase.js)
const BUCKET = 'cstore-photos'
const PAGE = 1000 // Supabase returns at most 1000 rows per request

const IN_USE = {
  products: 'This product has receive or issue records. Delete those records first.',
  projects: 'This project is used in issue records, so it cannot be deleted.',
  departments: 'This department is used in issue records, so it cannot be deleted.',
}
const REF_MISSING = 'The chosen product, project or department no longer exists'

const SELECT = {
  projects: '*',
  departments: '*, project:projects(name)',
  products: '*',
  receives: '*, product:products(name,unit,image_url)',
  issues: '*, product:products(name,unit,image_url), project:projects(name), department:departments(name)',
}
const EQ = {
  products: { quality: 'quality' },
  receives: { product: 'product_id' },
  issues: { product: 'product_id', project: 'project_id', department: 'department_id' },
  projects: {},
  departments: { project: 'project_id' },
}
const DATE = { receives: 'received_date', issues: 'issue_date' }
const SEARCH = {
  products: ['name', 'category'],
  receives: ['product_name', 'supplier'],
  issues: ['product_name', 'issued_to'],
  projects: ['name', 'manager_name'],
  departments: ['name'],
}

/* ---------- errors in plain words ---------- */

function explain(error, table, action) {
  const { code, message = '' } = error
  if (/failed to fetch|networkerror|load failed/i.test(message)) return new Error('Could not reach Supabase. Check your internet connection.')
  if (code === '23503') return new Error(action === 'delete' ? IN_USE[table] || 'This record is used by other records' : REF_MISSING)
  if (code === '23514') return new Error(/quantity/.test(message) ? 'The quantity must be more than 0' : 'A required field is empty')
  if (code === '23502') return new Error('A required field is empty')
  const setup = setupProblem(error)
  if (setup) return new Error(setup)
  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return new Error('This account is not allowed to use the store data')
  }
  if (code === 'PGRST116') return new Error('Record not found')
  return new Error(message || 'Something went wrong') // includes our stock rules, e.g. "Only 70 bag available in stock"
}

/* ---------- reading ---------- */

function flatten(table, r) {
  const { product, project, department, ...row } = r
  if (table === 'receives' || table === 'issues') {
    row.product_name = product?.name
    row.product_unit = product?.unit
    row.product_image = product?.image_url
  }
  if (table === 'issues') {
    row.project_name = project?.name
    row.department_name = department?.name
  }
  if (table === 'departments') row.project_name = project?.name
  if ('quantity' in row) row.quantity = Number(row.quantity)
  return row
}

async function fetchAll(table, build) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().order('id').range(from, from + PAGE - 1)
    if (error) throw explain(error, table, 'list')
    rows.push(...data)
    if (data.length < PAGE) return rows
  }
}

const text = (v) => String(v ?? '').toLowerCase()
const byText = (a, b) => text(a).localeCompare(text(b))

async function list(table, q = {}) {
  const build = () => {
    let query = supabase.from(NAME(table)).select(SELECT[table])
    for (const [key, col] of Object.entries(EQ[table])) if (q[key]) query = query.eq(col, q[key])
    if (DATE[table]) {
      if (q.from) query = query.gte(DATE[table], q.from)
      if (q.to) query = query.lte(DATE[table], q.to)
    }
    return query
  }
  let rows = (await fetchAll(table, build)).map((r) => flatten(table, r))

  const search = text(q.search).trim()
  if (search) rows = rows.filter((r) => SEARCH[table].some((c) => text(r[c]).includes(search)))
  if (table === 'products' && (q.low === true || q.low === '1')) rows = rows.filter((r) => r.quantity <= LOW_STOCK_LEVEL)

  const newestFirst = (a, b) =>
    String(b[DATE[table]]).localeCompare(String(a[DATE[table]])) || String(b.created_at).localeCompare(String(a.created_at))
  rows.sort(
    table === 'receives' || table === 'issues'
      ? newestFirst
      : table === 'departments'
        ? (a, b) => byText(a.project_name, b.project_name) || byText(a.name, b.name)
        : (a, b) => byText(a.name, b.name)
  )
  return rows
}

async function get(table, id) {
  const { data, error } = await supabase.from(NAME(table)).select('*').eq('id', id).maybeSingle()
  if (error) throw explain(error, table, 'list')
  return data
}

/* ---------- writing ---------- */

async function insert(table, row) {
  const { data, error } = await supabase.from(NAME(table)).insert(row).select().single()
  if (error) throw explain(error, table, 'save')
  return data
}

async function update(table, id, changes) {
  const { data, error } = await supabase.from(NAME(table)).update(changes).eq('id', id).select().single()
  if (error) throw explain(error, table, 'save')
  return data
}

async function remove(table, id) {
  const { error } = await supabase.from(NAME(table)).delete().eq('id', id)
  if (error) throw explain(error, table, 'delete')
  return { deleted: id }
}

/* ---------- photos (Supabase Storage, bucket cstore-photos) ---------- */

async function upload(file) {
  const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace(/[^a-z0-9]/gi, '')
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'image/jpeg', cacheControl: '31536000' })
  if (error) throw new Error(`Could not save the photo: ${error.message}`)
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// Best effort: a leftover photo file does no harm
async function removePhoto(url) {
  const path = String(url || '').match(new RegExp(`/object/public/${BUCKET}/(.+)$`))?.[1]
  if (!path) return
  try {
    await supabase.storage.from(BUCKET).remove([decodeURIComponent(path)])
  } catch {
    /* ignore */
  }
}

export const dbApi = { list, get, insert, update, remove, upload, removePhoto }
