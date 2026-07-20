import { useEffect, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

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

type TeamMember = {
    id: string
    name: string
    email?: string | null
    role: 'owner' | 'manager' | 'staff' | string
    avatarUrl?: string | null
    joinedAt?: string | null
}

type TeamModalProps = {
    businessId: string
    businessName: string
    onClose: () => void
}

const roleStyles: Record<string, { bg: string; color: string }> = {
    owner: { bg: 'bg-green-50', color: 'text-green-700' },
    manager: { bg: 'bg-blue-50', color: 'text-blue-700' },
    staff: { bg: 'bg-gray-100', color: 'text-gray-600' },
}

// Owners first, then managers, then staff — mirrors how permissions cascade
// so the most senior people are easiest to find at a glance.
const roleOrder: Record<string, number> = { owner: 0, manager: 1, staff: 2 }

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
}

export default function TeamModal({ businessId, businessName, onClose }: TeamModalProps) {
    const [members, setMembers] = useState<TeamMember[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let cancelled = false

        const fetchMembers = async () => {
            setLoading(true)
            setError('')
            try {
                const res = await fetch(`${API_BASE_URL}/business/${businessId}/members`, {
                    method: 'GET',
                    headers: authHeaders(),
                })

                const data = await res.json()

                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'Failed to load team')
                }

                if (cancelled) return

                // Normalize raw Postgres columns the same way the rest of
                // this codebase does (snake_case -> camelCase).
                const normalized: TeamMember[] = (data.data || []).map((m: any) => ({
                    id: String(m.id ?? m.user_id ?? m.userId),
                    name: m.name ?? m.full_name ?? m.fullName ?? 'Unknown',
                    email: m.email ?? null,
                    role: m.role ?? 'staff',
                    avatarUrl: m.avatarUrl ?? m.avatar_url ?? null,
                    joinedAt: m.joinedAt ?? m.joined_at ?? null,
                }))

                normalized.sort((a, b) => (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99))
                setMembers(normalized)
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchMembers()
        return () => {
            cancelled = true
        }
    }, [businessId])

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">Team</h2>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[280px]">{businessName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-colors shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-y-auto flex-1">
                    {loading && (
                        <div className="px-5 py-10 text-center text-sm text-gray-400">Loading team...</div>
                    )}

                    {!loading && error && (
                        <div className="px-5 py-6">
                            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                {error}
                            </div>
                        </div>
                    )}

                    {!loading && !error && members.length === 0 && (
                        <div className="px-5 py-10 text-center text-sm text-gray-400">No team members yet.</div>
                    )}

                    {!loading && !error && members.length > 0 && (
                        <div className="divide-y divide-gray-100">
                            {members.map((member) => {
                                const style = roleStyles[member.role] ?? roleStyles.staff
                                return (
                                    <div key={member.id} className="flex items-center gap-3 px-5 py-3.5">
                                        <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center shrink-0 overflow-hidden">
                                            {member.avatarUrl ? (
                                                <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                                            ) : (
                                                initials(member.name)
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
                                            {member.email && (
                                                <p className="text-xs text-gray-400 truncate">{member.email}</p>
                                            )}
                                        </div>
                                        <span className={`text-[11px] font-semibold capitalize rounded-full px-2.5 py-1 shrink-0 ${style.bg} ${style.color}`}>
                                            {member.role}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}