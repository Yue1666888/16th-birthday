import { createBrowserRouter } from 'react-router'
export const router = createBrowserRouter([
  {
    path: '/',
    lazy: async () => ({
      Component: (await import('@/pages/home/HomePage')).HomePage,
    }),
  },
  {
    path: '*',
    lazy: async () => ({
      Component: (await import('@/components/common/NotFoundPage'))
        .NotFoundPage,
    }),
  },
])
