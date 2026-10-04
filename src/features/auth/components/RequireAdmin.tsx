import { Outlet } from 'react-router'
import { SheetLayout } from '@/components/SheetLayout'
import { useAuth } from '@/features/auth/hooks/AuthContext'

/**
 * Garde des écrans d'administration. À placer à l'intérieur de <RequireAuth>.
 *
 * Simple confort d'affichage : un membre qui forcerait l'adresse verrait des
 * écrans vides, car c'est la base qui refuse les données et les modifications.
 */
export function RequireAdmin() {
  const { state } = useAuth()

  if (state.status === 'ready' && state.isAdmin) return <Outlet />

  return (
    <SheetLayout title="Accès réservé" back={{ to: '/', label: 'Carte' }}>
      <p className="text-lg">Cette partie de l'application est réservée aux administrateurs.</p>
    </SheetLayout>
  )
}
