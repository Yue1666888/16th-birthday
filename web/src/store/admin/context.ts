import { createContext } from 'react'
import type { AdminStore } from './store'
export const AdminStoreContext = createContext<AdminStore | null>(null)
