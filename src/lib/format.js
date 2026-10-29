const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

// Local date as YYYY-MM-DD
export const today = () => new Date().toLocaleDateString('en-CA')

export function fmtDate(s) {
  if (!s) return '—'
  const [y, m, d] = String(s).slice(0, 10).split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`
}
