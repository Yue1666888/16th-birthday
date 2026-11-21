import type { RouteObject } from 'react-router'
export const homeRoutes: RouteObject[] = [
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
