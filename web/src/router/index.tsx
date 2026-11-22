import { createBrowserRouter } from 'react-router'
import { adminRoutes } from './admin.routes'
import { homeRoutes } from './home.routes'
import { RouteError } from '@/components/common/RouteError'
import { RouteLoading } from '@/components/common/RouteLoading'
export const router = createBrowserRouter([
  {
    hydrateFallbackElement: <RouteLoading />,
    errorElement: <RouteError />,
    children: [
      ...homeRoutes,
      ...adminRoutes,
      {
        path: '*',
        lazy: async () => ({
          Component: (await import('@/components/common/NotFoundPage'))
            .NotFoundPage,
        }),
      },
    ],
  },
])
