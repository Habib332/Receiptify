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
    // The viewer's own role for this business ('owner' | 'manager' | 'staff').
    // Drives whether the remove button shows at all, and on which rows —
    // the backend re-checks this regardless, this is just for a clean UI.
    currentUserRole?: string | null
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

// Mirrors the backend's rule in business.service.js removeMemberFromBusiness:
// owner can remove managers/staff, manager can remove staff only, nobody
// can remove an owner. Kept here just to decide whether to show the button —
// the server is the actual source of truth.
function canRemove(viewerRole: string | null | undefined, targetRole: string) {
    if (targetRole === 'owner') return false
    if (viewerRole === 'owner') return true
    if (viewerRole === 'manager') return targetRole === 'staff'
    return false
}

export default function TeamModal({ businessId, businessName, currentUserRole, onClose }: TeamModalProps) {
    const [members, setMembers] = useState<TeamMember[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null)
    const [removeLoading, setRemoveLoading] = useState(false)
    const [removeError, setRemoveError] = useState('')

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

    const handleRemove = async () => {
        if (!removeTarget) return
        setRemoveLoading(true)
        setRemoveError('')
        try {
            const res = await fetch(`${API_BASE_URL}/business/${businessId}/members/${removeTarget.id}`, {
                method: 'DELETE',
                headers: authHeaders(),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to remove member')
            }

            setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id))
            setRemoveTarget(null)
        } catch (err) {
            setRemoveError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setRemoveLoading(false)
        }
    }

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
                                        {canRemove(currentUserRole, member.role) && (
                                            <button
                                                onClick={() => {
                                                    setRemoveError('')
                                                    setRemoveTarget(member)
                                                }}
                                                className="text-[11px] font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full px-2.5 py-1 shrink-0 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {removeTarget && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] px-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                        <div className="w-11 h-11 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-1.5">
                            Remove {removeTarget.name}?
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            They will lose access to this business and its data. This action can't be undone.
                        </p>
                        {removeError && (
                            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
                                {removeError}
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setRemoveTarget(null)}
                                disabled={removeLoading}
                                className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRemove}
                                disabled={removeLoading}
                                className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                            >
                                {removeLoading ? 'Removing...' : 'Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}