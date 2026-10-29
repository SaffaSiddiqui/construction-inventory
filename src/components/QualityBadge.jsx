import { QUALITIES } from '../lib/schema'

export default function QualityBadge({ quality }) {
  if (!quality) return null
  const i = QUALITIES.indexOf(quality)
  return <span className={`badge ${i >= 0 ? `badge--q${i}` : ''}`}>{quality}</span>
}
