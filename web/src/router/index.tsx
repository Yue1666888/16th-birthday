import { createBrowserRouter } from 'react-router'
import { adminRoutes } from './admin.routes'
import { homeRoutes } from './home.routes'
import { RouteError } from '@/components/common/RouteError'
export const router = createBrowserRouter([
  {
    hydrateFallbackElement: (
      <div
        role="status"
        style={{ padding: 32, color: '#8a96aa', fontSize: 13 }}
      >
        正在打开页面…
      </div>
    ),
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
