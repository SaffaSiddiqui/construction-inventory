// Every table of this app lives in its own Supabase schema called "cstore" (see src/lib/supabase.js),
// so it stays apart from everything else in your Supabase project.
export const TABLE_ORDER = ['projects', 'departments', 'products', 'receives', 'issues']

export const QUALITIES = ['Grade A', 'Grade B', 'Grade C']
export const UNITS = ['bag', 'ton', 'kg', 'piece', 'meter', 'feet', 'liter', 'box', 'roll', 'cubic feet']
export const LOW_STOCK_LEVEL = Number(import.meta.env.VITE_LOW_STOCK_LEVEL || 10)
export const COMPANY_NAME = import.meta.env.VITE_COMPANY_NAME || 'Construction Store'
