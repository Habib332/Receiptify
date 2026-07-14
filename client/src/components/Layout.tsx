import { useState, useEffect, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import MainLogo from '../logo/MainLogo'
import UserProfileModal from '../pages/profile/UserProfileModal'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

type Props = {
    children: ReactNode
}

type CurrentUser = {
    user_id: number
    name: string
    email: string
    avatar_url: string | null
}

function getToken() {
    return sessionStorage.getItem('token')
}

function authHeaders() {
    const token = getToken()
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const navItems = [
    {
        to: '/scan',
        label: 'Scan Receipts',
        icon: (active: boolean) => (
            <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={active ? 2 : 1.8}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38 0-.753-.116-1.076-.334a2.32 2.32 0 01-.734-.847 2.29 2.29 0 01-.239-1.089 2.31 2.31 0 01.334-1.076c.19-.319.462-.573.79-.734a2.29 2.29 0 011.089-.239h13.42a2.29 2.29 0 011.089.239c.328.161.6.415.79.734.19.319.316.68.334 1.076a2.29 2.29 0 01-.239 1.089 2.32 2.32 0 01-.734.847 2.31 2.31 0 01-1.076.334 2.31 2.31 0 01-1.641-1.055M6.827 6.175L3.75 20.25h16.5L17.173 6.175M6.827 6.175h10.346"
                />
                <circle cx="12" cy="13" r="2.75" />
            </svg>
        ),
    },
    {
        to: '/dashboard',
        label: 'See Data',
        icon: (active: boolean) => (
            <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={active ? 2 : 1.8}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.5l3.75-3.75L10 13l4.5-6L21 13.5M3 20.25h18M3 20.25V16.5m18 3.75V13.5"
                />
            </svg>
        ),
    },
    {
        to: '/select-business',
        label: 'Businesses',
        icon: (active: boolean) => (
            <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={active ? 2 : 1.8}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"
                />
            </svg>
        ),
    },
]

export default function Layout({ children }: Props) {
    const [user, setUser] = useState<CurrentUser | null>(null)
    const [showProfileModal, setShowProfileModal] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function fetchMe() {
            try {
                const res = await fetch(`${API_BASE_URL}/auth/me`, {
                    method: 'GET',
                    headers: authHeaders(),
                })

                const data = await res.json()

                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'Failed to load user')
                }

                if (!cancelled) setUser(data.data)
            } catch (err) {
                // Sidebar shouldn't block the page; surface silently in console
                console.error(err)
            }
        }

        fetchMe()
        return () => {
            cancelled = true
        }
    }, [])

    const displayName = user?.name ?? 'Loading...'
    const initials = user?.name ? getInitials(user.name) : '—'

    return (
        <div className="h-screen w-full bg-white flex overflow-hidden">
            {/* Sidebar */}
            <aside className="w-[240px] shrink-0 border-r border-gray-100 flex flex-col px-4 py-6">
                <div className="px-2 mb-8">
                    <MainLogo size={30} />
                </div>

                <nav className="flex-1 flex flex-col gap-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {item.icon(isActive)}
                                    {item.label}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="flex flex-col gap-1 pt-4 mt-4 border-t border-gray-100">
                    <NavLink
                        to="/about-the-creators"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                            }`
                        }
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.8}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                            />
                        </svg>

                        About the Creators
                    </NavLink>

                    <button
                        onClick={() => setShowProfileModal(true)}
                        className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-blue-600 text-xs font-semibold">{initials}</span>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {displayName}
                            </p>
                            <p className="text-xs text-gray-400">View profile</p>
                        </div>

                        <svg
                            className="w-4 h-4 text-gray-300 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8.25 4.5l7.5 7.5-7.5 7.5"
                            />
                        </svg>
                    </button>
                </div>
            </aside >

            {/* Main content */}
            < main className="flex-1 overflow-y-auto" >
                <div className="max-w-6xl mx-auto px-8 py-6">{children}</div>
            </main >

            {showProfileModal && (
                <UserProfileModal onClose={() => setShowProfileModal(false)} />
            )}
        </div >
    )
}