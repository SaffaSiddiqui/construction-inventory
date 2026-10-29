import ProductForm from './ProductForm'
import ReceiveForm from './ReceiveForm'
import IssueForm from './IssueForm'
import ProjectForm from './ProjectForm'
import DepartmentForm from './DepartmentForm'

export const SINGULAR = { products: 'product', receives: 'receipt', issues: 'issue', projects: 'project', departments: 'department' }

export const formTitle = (table, editing) => `${editing ? 'Edit' : 'Add'} ${SINGULAR[table]}`

// Picks the right form for a table. Used by the Database page.
export default function FormFor({ table, initial, lookups, onSaved, onCancel }) {
  const common = { initial, onSaved, onCancel }
  switch (table) {
    case 'products': return <ProductForm {...common} />
    case 'receives': return <ReceiveForm {...common} products={lookups.products} />
    case 'issues': return <IssueForm {...common} products={lookups.products} projects={lookups.projects} departments={lookups.departments} />
    case 'projects': return <ProjectForm {...common} />
    default: return <DepartmentForm {...common} projects={lookups.projects} />
  }
}
