import { Navigate } from 'react-router'
import type { RouteObject } from 'react-router'
export const adminRoutes: RouteObject[] = [
  {
    path: '/admin/signed-out',
    lazy: async () => ({
      Component: (await import('@/pages/admin/signed-out/SignedOutPage'))
        .SignedOutPage,
    }),
  },
  {
    path: '/admin',
    lazy: async () => ({
      Component: (await import('@/router/guards')).AdminAuthBoundary,
    }),
    children: [
      {
        lazy: async () => ({
          Component: (await import('@/layouts/AdminLayout')).AdminLayout,
        }),
        children: [
          {
            index: true,
            element: <Navigate to="/admin/invitations" replace />,
          },
          {
            path: 'invitations',
            lazy: async () => ({
              Component: (
                await import('@/pages/admin/invitations/InvitationsPage')
              ).InvitationsPage,
            }),
          },
          {
            path: 'honors',
            lazy: async () => ({
              Component: (await import('@/pages/admin/honors/HonorsPage'))
                .HonorsPage,
            }),
          },
        ],
      },
    ],
  },
]
