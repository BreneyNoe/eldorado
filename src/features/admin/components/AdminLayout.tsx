import { ArrowLeft } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'

const SECTIONS = [
  { to: '/admin/users', label: 'Utilisateurs' },
  { to: '/admin/spots', label: 'Spots' },
  { to: '/admin/photos', label: 'Photos' },
  { to: '/admin/updates', label: 'Updates' },
  { to: '/admin/types', label: 'Types' },
  { to: '/admin/settings', label: 'Réglages' },
]

/** Cadre commun des écrans d'administration : titre, onglets, contenu. Utilisable sur téléphone comme sur ordinateur. */
export function AdminLayout() {
  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="safe-top safe-x shrink-0 bg-ink text-paper">
        <div className="mx-auto w-full max-w-4xl px-2 pt-2">
          <div className="flex items-center gap-1">
            <Link
              to="/"
              aria-label="Retour à la carte"
              className="flex size-12 shrink-0 items-center justify-center rounded-full active:bg-paper/15"
            >
              <ArrowLeft className="size-6" aria-hidden="true" />
            </Link>
            <h1 className="text-2xl font-semibold">Administration</h1>
          </div>
          <nav
            aria-label="Sections de l'administration"
            className="mt-1 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {SECTIONS.map((section) => (
              <NavLink
                key={section.to}
                to={section.to}
                className={({ isActive }) =>
                  `flex h-12 shrink-0 items-center border-b-4 px-3 text-base font-semibold ${
                    isActive ? 'border-blaze text-paper' : 'border-transparent text-paper/70'
                  }`
                }
              >
                {section.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="safe-x min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="safe-bottom">
          <div className="mx-auto w-full max-w-4xl px-4 pt-5 pb-10">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
