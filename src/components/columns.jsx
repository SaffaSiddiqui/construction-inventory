import ProductThumb from './ProductThumb'
import { fmt, fmtDate } from '../lib/format'

const Material = ({ r }) => (
  <span className="cell-product">
    <ProductThumb url={r.product_image} alt="" />
    <span>{r.product_name || 'Deleted product'}</span>
  </span>
)
const Qty = ({ r }) => <strong>{fmt(r.quantity)} <small className="unit">{r.product_unit}</small></strong>

export const receiveColumns = [
  { key: 'received_date', label: 'Date', render: (r) => fmtDate(r.received_date) },
  { key: 'product_name', label: 'Material', render: (r) => <Material r={r} /> },
  { key: 'quantity', label: 'Quantity', className: 'num', render: (r) => <Qty r={r} /> },
  { key: 'supplier', label: 'Supplier' },
  { key: 'note', label: 'Note', className: 'muted' },
]

export const issueColumns = [
  { key: 'issue_date', label: 'Date', render: (r) => fmtDate(r.issue_date) },
  { key: 'product_name', label: 'Material', render: (r) => <Material r={r} /> },
  { key: 'quantity', label: 'Quantity', className: 'num', render: (r) => <Qty r={r} /> },
  { key: 'project_name', label: 'Project' },
  { key: 'department_name', label: 'Department' },
  { key: 'issued_to', label: 'Issued to' },
  { key: 'note', label: 'Note', className: 'muted' },
]

export const projectColumns = [
  { key: 'name', label: 'Project' },
  { key: 'manager_name', label: 'Manager' },
]

export const departmentColumns = [
  { key: 'name', label: 'Department' },
  { key: 'project_name', label: 'Project', render: (r) => r.project_name || 'All projects' },
]
