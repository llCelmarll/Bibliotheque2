import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { to: '/dashboard', label: 'Tableau de bord' },
  { to: '/reports', label: 'Signalements' },
  { to: '/users', label: 'Utilisateurs' },
  { to: '/entities', label: 'Entités' },
]

const adminItems = [
  { to: '/whitelist', label: 'Whitelist' },
  { to: '/audit-log', label: 'Audit Log' },
]

export default function Layout() {
  const { user, isAdmin, logout } = useAuth()

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-56 bg-gray-900 text-white flex flex-col py-6 px-4 gap-1">
        <div className="mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Ma Bibliothèque</p>
          <p className="font-semibold text-sm truncate">{user?.username}</p>
          <span className="text-xs px-2 py-0.5 rounded bg-indigo-600 mt-1 inline-block">
            {user?.role}
          </span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded text-sm transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <hr className="border-gray-700 my-2" />
              <p className="text-xs text-gray-500 uppercase tracking-wider px-3 mb-1">Admin</p>
              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded text-sm transition-colors ${
                      isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <button
          onClick={logout}
          className="mt-auto px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors text-left"
        >
          Se déconnecter
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
