// Adds readable names (product_name, project_name...) to rows loaded from the database.
const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]))

export function enrichReceives({ receives, products }) {
  const p = byId(products)
  return receives
    .map((r) => ({
      ...r,
      product_name: p[r.product_id]?.name,
      product_unit: p[r.product_id]?.unit,
      product_image: p[r.product_id]?.image_url,
    }))
    .sort((a, b) => String(b.received_date).localeCompare(String(a.received_date)))
}

export function enrichIssues({ issues, products, projects, departments }) {
  const p = byId(products)
  const pr = byId(projects)
  const d = byId(departments)
  return issues
    .map((r) => ({
      ...r,
      product_name: p[r.product_id]?.name,
      product_unit: p[r.product_id]?.unit,
      product_image: p[r.product_id]?.image_url,
      project_name: pr[r.project_id]?.name,
      department_name: d[r.department_id]?.name,
    }))
    .sort((a, b) => String(b.issue_date).localeCompare(String(a.issue_date)))
}

export function enrichDepartments({ departments, projects }) {
  const pr = byId(projects)
  return departments.map((d) => ({ ...d, project_name: pr[d.project_id]?.name }))
}

export function productFlow({ receives, issues }) {
  const m = {}
  receives.forEach((r) => {
    m[r.product_id] ||= { received: 0, issued: 0 }
    m[r.product_id].received += Number(r.quantity)
  })
  issues.forEach((r) => {
    m[r.product_id] ||= { received: 0, issued: 0 }
    m[r.product_id].issued += Number(r.quantity)
  })
  return m
}
