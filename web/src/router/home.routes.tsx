import type { RouteObject } from 'react-router'
const visitorPageRoutes: RouteObject[] = [
  {
    path: '/',
    lazy: async () => ({
      Component: (await import('@/pages/home/HomePage')).HomePage,
    }),
  },
  {
    lazy: async () => ({
      Component: (await import('@/layouts/VisitorLayout')).VisitorLayout,
    }),
    children: [
      {
        path: '/invitation',
        lazy: async () => ({
          Component: (await import('@/pages/visitor/invitation/InvitationPage'))
            .InvitationPage,
        }),
      },
      {
        path: '/chronicle',
        lazy: async () => ({
          Component: (await import('@/pages/visitor/chronicle/ChroniclePage'))
            .ChroniclePage,
        }),
      },
      {
        path: '/memories',
        lazy: async () => ({
          Component: (await import('@/pages/visitor/memories/MemoryWallPage'))
            .MemoryWallPage,
        }),
      },
      {
        path: '/honors',
        lazy: async () => ({
          Component: (await import('@/pages/visitor/honors/HonorWallPage'))
            .HonorWallPage,
        }),
      },
    ],
  },
]

export const homeRoutes: RouteObject[] = [
  {
    lazy: async () => ({
      Component: (
        await import('@/features/visitor/experience/VisitorExperienceLayout')
      ).VisitorExperienceLayout,
    }),
    children: visitorPageRoutes,
  },
]
