import { useContext } from 'react'
import { useStore } from 'zustand'
import { AdminStoreContext } from './context'
import type { AdminState } from './store'
export function useAdminStore<T>(selector: (state: AdminState) => T) {
  const store = useContext(AdminStoreContext)
  if (!store) throw new Error('后台状态必须在管理员布局中使用')
  return useStore(store, selector)
}
