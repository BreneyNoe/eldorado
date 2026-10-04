import { createHashRouter, Navigate } from 'react-router'
import { NotFoundScreen } from '@/app/NotFoundScreen'
import { RouteErrorScreen } from '@/app/RouteErrorScreen'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { AccountScreen } from '@/features/auth/components/AccountScreen'
import { LoginScreen } from '@/features/auth/components/LoginScreen'
import { RequireAdmin } from '@/features/auth/components/RequireAdmin'
import { SignUpScreen } from '@/features/auth/components/SignUpScreen'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { DiagnosticScreen } from '@/features/diagnostic/components/DiagnosticScreen'
import { SpotScreen } from '@/features/spots/components/detail/SpotScreen'
import { ListScreen } from '@/features/spots/components/ListScreen'

/**
 * Routes de l'application.
 *
 * Routage par "#" (ex. https://site/#/account) : GitHub Pages ne sait servir
 * que des fichiers, il renverrait une erreur 404 sur une adresse comme
 * /account. Avec le "#", le serveur ne voit jamais la suite de l'adresse.
 */
export const router = createHashRouter([
  {
    // Route racine sans écran propre : elle sert uniquement à attraper les
    // erreurs de tous les écrans ci-dessous.
    errorElement: <RouteErrorScreen />,
    children: [
      { path: '/login', element: <LoginScreen /> },
      { path: '/signup', element: <SignUpScreen /> },
      // Accessible sans connexion : sert justement à comprendre pourquoi on n'y arrive pas.
      { path: '/diagnostic', element: <DiagnosticScreen /> },
      {
        element: <RequireAuth />,
        children: [
          {
            path: '/',
            // La carte (et MapLibre, volumineux) n'est téléchargée qu'après la
            // connexion : l'écran de connexion s'affiche ainsi tout de suite.
            lazy: async () => {
              const { MapScreen } = await import('@/features/map/components/MapScreen')
              return { Component: MapScreen }
            },
            HydrateFallback: FullScreenLoader,
          },
          { path: '/list', element: <ListScreen /> },
          {
            path: '/new',
            // Comme la carte : cet écran utilise MapLibre, chargé à la demande.
            lazy: async () => {
              const { CreateSpotScreen } = await import('@/features/spots/components/create/CreateSpotScreen')
              return { Component: CreateSpotScreen }
            },
            HydrateFallback: FullScreenLoader,
          },
          { path: '/spot/:id', element: <SpotScreen /> },
          {
            path: '/spot/:id/edit',
            // La modification peut rouvrir la carte de placement : chargée à la demande, comme la création.
            lazy: async () => {
              const { EditSpotScreen } = await import('@/features/spots/components/detail/EditSpotScreen')
              return { Component: EditSpotScreen }
            },
            HydrateFallback: FullScreenLoader,
          },
          { path: '/account', element: <AccountScreen /> },
          {
            // Administration : un garde de plus, puis un cadre commun à onglets.
            element: <RequireAdmin />,
            children: [
              {
                path: '/admin',
                // Chargée à la demande : seuls les administrateurs en ont besoin.
                lazy: async () => {
                  const { AdminLayout } = await import('@/features/admin/components/AdminLayout')
                  return { Component: AdminLayout }
                },
                HydrateFallback: FullScreenLoader,
                children: [
                  { index: true, element: <Navigate to="/admin/users" replace /> },
                  { path: 'users', lazy: async () => ({ Component: (await import('@/features/admin/components/AdminUsers')).AdminUsers }) },
                  { path: 'spots', lazy: async () => ({ Component: (await import('@/features/admin/components/AdminSpots')).AdminSpots }) },
                  { path: 'photos', lazy: async () => ({ Component: (await import('@/features/admin/components/AdminPhotos')).AdminPhotos }) },
                  { path: 'updates', lazy: async () => ({ Component: (await import('@/features/admin/components/AdminUpdates')).AdminUpdates }) },
                  { path: 'types', lazy: async () => ({ Component: (await import('@/features/admin/components/AdminTypes')).AdminTypes }) },
                  { path: 'settings', lazy: async () => ({ Component: (await import('@/features/admin/components/AdminSettings')).AdminSettings }) },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundScreen /> },
    ],
  },
])
