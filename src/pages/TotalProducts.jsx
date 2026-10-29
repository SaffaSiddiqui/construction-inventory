import { useMemo, useState } from 'react'
import { Boxes, Plus } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import FilterBar, { emptyFilters } from '../components/FilterBar'
import ProductCard from '../components/ProductCard'
import Empty from '../components/Empty'
import Modal from '../components/Modal'
import ProductForm from '../components/forms/ProductForm'
import { useData } from '../context/Data'
import { runDelete, useFeedback } from '../context/Feedback'
import { productFlow } from '../lib/enrich'
import { deleteProduct } from '../lib/inventory'
import { LOW_STOCK_LEVEL } from '../lib/schema'

export default function TotalProducts() {
  const { data, loading, error, reload } = useData()
  const { toast, confirm } = useFeedback()
  const [filters, setFilters] = useState(emptyFilters)
  const [editing, setEditing] = useState(null)

  const flow = useMemo(() => productFlow(data), [data])
  const rows = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return data.products
      .filter(
        (p) =>
          (!q || p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)) &&
          (!filters.quality || p.quality === filters.quality) &&
          (!filters.low || Number(p.quantity) <= LOW_STOCK_LEVEL)
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data.products, filters])

  const low = data.products.filter((p) => Number(p.quantity) > 0 && Number(p.quantity) <= LOW_STOCK_LEVEL).length
  const out = data.products.filter((p) => Number(p.quantity) <= 0).length

  const remove = (p) =>
    runDelete({
      confirm, toast,
      title: `Delete ${p.name}?`,
      message: 'The product and its photo will be removed.',
      confirmLabel: 'Delete product',
      action: () => deleteProduct(p.id),
      done: reload,
    })

  return (
    <div className="page page--total">
      <PageHeader
        title="Total Products"
        subtitle="Everything in the store right now: received minus issued."
        action={<button className="btn btn--primary" onClick={() => setEditing({})}><Plus size={18} /> Add product</button>}
      />
      <div className="stats">
        <StatCard label="Products" value={data.products.length} />
        <StatCard label="Low stock" value={low} note={`${LOW_STOCK_LEVEL} or less left`} />
        <StatCard label="Out of stock" value={out} />
      </div>

      <FilterBar values={filters} onChange={setFilters} show={{ quality: true, low: true }} searchPlaceholder="Search product name" />

      {error && <p className="form-error">Could not load records: {error}</p>}
      {loading ? (
        <p className="loading">Loading products…</p>
      ) : rows.length ? (
        <div className="cards">
          {rows.map((p) => (
            <ProductCard key={p.id} product={p} flow={flow[p.id] || { received: 0, issued: 0 }} onEdit={setEditing} onDelete={remove} />
          ))}
        </div>
      ) : (
        <Empty
          icon={Boxes}
          title={data.products.length ? 'No products match these filters' : 'No products yet'}
          text={data.products.length ? 'Try a different name or quality.' : 'Add your first product, with a photo and its opening stock.'}
        />
      )}

      {editing && (
        <Modal title={editing.id ? 'Edit product' : 'Add product'} onClose={() => setEditing(null)}>
          <ProductForm
            initial={editing.id ? editing : null}
            onSaved={(m) => { setEditing(null); toast(m); reload() }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  )
}
