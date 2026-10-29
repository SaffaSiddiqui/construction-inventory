import { Pencil, Trash2 } from 'lucide-react'
import ProductThumb from './ProductThumb'
import QualityBadge from './QualityBadge'
import { fmt } from '../lib/format'
import { LOW_STOCK_LEVEL } from '../lib/schema'

export default function ProductCard({ product: p, flow, onEdit, onDelete }) {
  const qty = Number(p.quantity)
  const state = qty <= 0 ? 'out' : qty <= LOW_STOCK_LEVEL ? 'low' : 'ok'
  return (
    <article className={`pcard pcard--${state}`}>
      <div className="pcard-img">
        <ProductThumb url={p.image_url} alt={p.name} size="lg" />
        {state !== 'ok' && <span className={`stock-flag stock-flag--${state}`}>{state === 'out' ? 'Out of stock' : 'Low stock'}</span>}
      </div>
      <div className="pcard-body">
        <div className="pcard-top">
          <h3>{p.name}</h3>
          <QualityBadge quality={p.quality} />
        </div>
        {p.category && <p className="pcard-cat">{p.category}</p>}
        <p className="pcard-qty"><strong>{fmt(qty)}</strong> <span>{p.unit} in stock</span></p>
        {flow && (
          <dl className="pcard-flow">
            <div><dt>Received</dt><dd>{fmt(flow.received)}</dd></div>
            <div><dt>Issued</dt><dd>{fmt(flow.issued)}</dd></div>
          </dl>
        )}
      </div>
      <div className="pcard-actions">
        <button className="btn btn--ghost btn--sm" onClick={() => onEdit(p)}><Pencil size={15} /> Edit</button>
        <button className="btn btn--ghost btn--sm btn--danger-text" onClick={() => onDelete(p)}><Trash2 size={15} /> Delete</button>
      </div>
    </article>
  )
}
