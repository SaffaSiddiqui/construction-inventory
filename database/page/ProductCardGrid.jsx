import { Boxes } from 'lucide-react'
import ProductCard from '../../src/components/ProductCard'
import Empty from '../../src/components/Empty'

export default function ProductCardGrid({ products, flow, onEdit, onDelete, filtered }) {
  if (!products.length) {
    return (
      <Empty
        icon={Boxes}
        title={filtered ? 'No products match these filters' : 'No products yet'}
        text={filtered ? 'Try a different name or quality.' : 'Use the Add button to create the first product.'}
      />
    )
  }
  return (
    <div className="cards">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} flow={flow[p.id] || { received: 0, issued: 0 }} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}
