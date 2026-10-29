// What the forms call. The stock rules (no over-issue, stock = received - issued)
// are enforced inside the Supabase database (see supabase/setup.sql).
import { dbApi } from './dbApi'
import { today } from './format'

const num = (v) => Number(v) || 0
const clean = (v) => (typeof v === 'string' ? v.trim() || null : v ?? null)

/* ---------- products ---------- */

export async function createProduct(v, openingQty = 0, imageFile = null) {
  const image_url = imageFile ? await dbApi.upload(imageFile) : null
  const product = await dbApi.insert('products', {
    name: v.name.trim(),
    image_url,
    quality: clean(v.quality),
    unit: v.unit,
    category: clean(v.category),
    notes: clean(v.notes),
  })
  if (num(openingQty) > 0) {
    await createReceive({ product_id: product.id, quantity: openingQty, supplier: 'Opening stock', received_date: today(), note: '' })
  }
  return product.id
}

export async function updateProduct(id, v, imageFile = null) {
  const changes = {
    name: v.name.trim(),
    quality: clean(v.quality),
    unit: v.unit,
    category: clean(v.category),
    notes: clean(v.notes),
    image_url: v.image_url ?? null,
  }
  const old = await dbApi.get('products', id)
  if (imageFile) changes.image_url = await dbApi.upload(imageFile)
  const saved = await dbApi.update('products', id, changes)
  if (old?.image_url && old.image_url !== saved.image_url) await dbApi.removePhoto(old.image_url)
  return saved
}

export async function deleteProduct(id) {
  const old = await dbApi.get('products', id)
  await dbApi.remove('products', id)
  if (old?.image_url) await dbApi.removePhoto(old.image_url)
}

/* ---------- receive ---------- */

const receiveRow = (v) => ({
  product_id: v.product_id,
  quantity: num(v.quantity),
  supplier: clean(v.supplier),
  received_date: v.received_date || today(),
  note: clean(v.note),
})
export const createReceive = (v) => dbApi.insert('receives', receiveRow(v))
export const updateReceive = (id, v) => dbApi.update('receives', id, receiveRow(v))
export const deleteReceive = (id) => dbApi.remove('receives', id)

/* ---------- issue ---------- */

const issueRow = (v) => ({
  product_id: v.product_id,
  project_id: v.project_id,
  department_id: v.department_id || null,
  quantity: num(v.quantity),
  issued_to: clean(v.issued_to),
  issue_date: v.issue_date || today(),
  note: clean(v.note),
})
export const createIssue = (v) => dbApi.insert('issues', issueRow(v))
export const updateIssue = (id, v) => dbApi.update('issues', id, issueRow(v))
export const deleteIssue = (id) => dbApi.remove('issues', id)

/* ---------- projects and departments ---------- */

export const createProject = (v) => dbApi.insert('projects', { name: v.name.trim(), manager_name: v.manager_name.trim() })
export const updateProject = (id, v) => dbApi.update('projects', id, { name: v.name.trim(), manager_name: v.manager_name.trim() })
export const deleteProject = (id) => dbApi.remove('projects', id)

export const createDepartment = (v) => dbApi.insert('departments', { name: v.name.trim(), project_id: v.project_id || null })
export const updateDepartment = (id, v) => dbApi.update('departments', id, { name: v.name.trim(), project_id: v.project_id || null })
export const deleteDepartment = (id) => dbApi.remove('departments', id)

export const DELETERS = {
  products: deleteProduct,
  receives: deleteReceive,
  issues: deleteIssue,
  projects: deleteProject,
  departments: deleteDepartment,
}
