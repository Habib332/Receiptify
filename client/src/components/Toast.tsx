import { useEffect, useState, useCallback } from 'react'

// ---- Types ----
export type ToastType = 'success' | 'error' | 'info' | 'warning'

export type ToastPayload = {
    type: ToastType
    title: string
    message?: string
}

type ToastItem = ToastPayload & { id: number }

const STORAGE_KEY = 'pending_toast'
const AUTO_DISMISS_MS = 4000

// ---- Cross-page (post-redirect) toast ----
// Call this right before navigating to a new route when you want the
// toast to appear *after* the redirect lands (e.g. success -> dashboard,
// or error -> back to /scan). sessionStorage survives the navigation;
// <Toast /> (mounted in Layout) picks it up on mount.
export function queueToast(payload: ToastPayload) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
        // sessionStorage unavailable — non-critical, just skip the toast
    }
}

export function queueSuccessToast(title: string, message?: string) {
    queueToast({ type: 'success', title, message })
}

export function queueErrorToast(title: string, message?: string) {
    queueToast({ type: 'error', title, message })
}

// ---- Same-page (no redirect) toast ----
// Simple pub/sub so any component can call showToast(...) without needing
// a Context provider wired through the app.
type Listener = (payload: ToastPayload) => void
const listeners = new Set<Listener>()

export function showToast(payload: ToastPayload) {
    listeners.forEach((l) => l(payload))
}

export function showSuccessToast(title: string, message?: string) {
    showToast({ type: 'success', title, message })
}

export function showErrorToast(title: string, message?: string) {
    showToast({ type: 'error', title, message })
}

// ---- Visual styles (matches the warning/info/success/error mock) ----
const STYLES: Record<ToastType, { bar: string; bg: string; title: string; icon: React.ReactNode }> = {
    warning: {
        bar: 'bg-amber-400',
        bg: 'bg-amber-50',
        title: 'text-gray-900',
        icon: (
            <span className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center shrink-0">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2 1 21h22L12 2zm0 6a1 1 0 011 1v5a1 1 0 01-2 0V9a1 1 0 011-1zm0 9.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5z" />
                </svg>
            </span>
        ),
    },
    info: {
        bar: 'bg-blue-400',
        bg: 'bg-blue-50',
        title: 'text-gray-900',
        icon: (
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
            </span>
        ),
    },
    success: {
        bar: 'bg-green-500',
        bg: 'bg-green-50',
        title: 'text-gray-900',
        icon: (
            <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
            </span>
        ),
    },
    error: {
        bar: 'bg-red-500',
        bg: 'bg-red-50',
        title: 'text-gray-900',
        icon: (
            <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm3.54 12.12l-1.42 1.42L12 13.41l-2.12 2.13-1.42-1.42L10.59 12 8.46 9.88l1.42-1.42L12 10.59l2.12-2.13 1.42 1.42L13.41 12l2.13 2.12z" />
                </svg>
            </span>
        ),
    },
}

// ---- The component itself ----
// Mount this once, inside Layout, and it handles:
// 1. Picking up a queued toast from sessionStorage after a redirect
// 2. Listening for same-page showToast(...) calls
// Stacks multiple toasts if more than one fires in quick succession.
export default function Toast() {
    const [toasts, setToasts] = useState<ToastItem[]>([])

    const dismiss = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const push = useCallback((payload: ToastPayload) => {
        const id = Date.now() + Math.random()
        setToasts((prev) => [...prev, { ...payload, id }])
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    }, [dismiss])

    // Pick up a toast queued before a redirect (runs once on mount, and
    // again if Layout happens to remount on route changes).
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY)
            if (raw) {
                sessionStorage.removeItem(STORAGE_KEY)
                push(JSON.parse(raw) as ToastPayload)
            }
        } catch {
            // ignore malformed/missing payload
        }
    }, [push])

    // Listen for same-page toast calls.
    useEffect(() => {
        listeners.add(push)
        return () => {
            listeners.delete(push)
        }
    }, [push])

    if (toasts.length === 0) return null

    return (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:top-6 sm:right-6 z-[100] flex flex-col gap-2 sm:w-96">
            {toasts.map((t) => {
                const style = STYLES[t.type]
                return (
                    <div
                        key={t.id}
                        className={`relative overflow-hidden rounded-lg shadow-md border border-black/5 ${style.bg} px-4 py-3 flex items-start gap-2.5 animate-[toast-in_0.2s_ease-out]`}
                    >
                        <span className={`absolute left-0 top-0 bottom-0 w-1 ${style.bar}`} />
                        {style.icon}
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${style.title}`}>{t.title}</p>
                            {t.message && (
                                <p className="text-xs text-gray-500 mt-0.5">{t.message}</p>
                            )}
                        </div>
                        <button
                            onClick={() => dismiss(t.id)}
                            className="text-gray-400 hover:text-gray-600 shrink-0 -m-1 p-1"
                            aria-label="Dismiss"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )
            })}
        </div>
    )
}