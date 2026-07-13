import { useEffect } from 'react'

export type NotificationItem = {
    id: string
    type: string // e.g. 'business_join'
    message: string
    businessName?: string | null
    actorName?: string | null // the user who joined
    createdAt: string
    read: boolean
}

type Props = {
    notifications: NotificationItem[]
    loading: boolean
    onClose: () => void
    onMarkRead: (id: string) => void
    onMarkAllRead: () => void
}

function timeAgo(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
}

export default function NotificationsModal({ notifications, loading, onClose, onMarkRead, onMarkAllRead }: Props) {
    // Close on Escape
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [onClose])

    const hasUnread = notifications.some((n) => !n.read)

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/20" onClick={onClose}>
            <div
                className="mt-16 mr-6 w-96 max-h-[70vh] bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                    <div className="flex items-center gap-3">
                        {hasUnread && (
                            <button
                                onClick={onMarkAllRead}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Mark all read
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto divide-y divide-gray-100">
                    {loading && notifications.length === 0 && (
                        <div className="px-5 py-10 text-center text-sm text-gray-400">Loading notifications...</div>
                    )}

                    {!loading && notifications.length === 0 && (
                        <div className="px-5 py-10 text-center text-sm text-gray-400">No notifications yet.</div>
                    )}

                    {notifications.map((n) => (
                        <button
                            key={n.id}
                            onClick={() => !n.read && onMarkRead(n.id)}
                            className={`w-full text-left px-5 py-3.5 flex items-start gap-3 transition-colors hover:bg-gray-50 ${
                                n.read ? '' : 'bg-blue-50/50'
                            }`}
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
                                <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                            </div>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}