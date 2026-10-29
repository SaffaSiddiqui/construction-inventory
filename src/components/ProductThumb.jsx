import { useState } from 'react'
import { Package } from 'lucide-react'

export default function ProductThumb({ url, alt = '', size = 'sm' }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className={`thumb thumb--${size}`}>
      {url && !failed ? (
        <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <Package size={size === 'sm' ? 18 : 40} aria-hidden="true" />
      )}
    </span>
  )
}
