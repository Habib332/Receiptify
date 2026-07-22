import { useEffect, useRef, useState } from 'react'
import { getBusinessIcon } from '../business/BusinessIcons'

type BusinessOption = {
    id: string
    name: string
    type: string
    logoUrl?: string | null
    userRole?: string | null
}

type BusinessSelectorProps = {
    businesses: BusinessOption[]
    selectedId: string | 'all'
    onChange: (id: string | 'all') => void
    loading?: boolean
    // True while a select-business call (or the all-businesses fetch loop)
    // is in flight. The dropdown disables itself during this so a second
    // switch can't fire before the sessionToken from the first has landed
    // in sessionStorage.
    switching?: boolean
}

export default function BusinessSelector({ businesses, selectedId, onChange, loading, switching }: BusinessSelectorProps) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onClickOutside)
        return () => document.removeEventListener('mousedown', onClickOutside)
    }, [])

    const selected = selectedId === 'all' ? null : businesses.find((b) => b.id === selectedId) || null
    const disabled = !!loading || !!switching

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => !disabled && setOpen((v) => !v)}
                disabled={disabled}
                className="flex items-center gap-2.5 border border-gray-200 rounded-lg pl-2 pr-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors min-w-[200px] disabled:opacity-60 disabled:cursor-wait"
            >
                {selected ? (
                    <span className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        {selected.logoUrl ? (
                            <img
                                src={selected.logoUrl}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            getBusinessIcon(selected.type).icon
                        )}
                    </span>
                ) : (
                    <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                        <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.8}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                            />
                        </svg>
                    </span>
                )}

                <span className="flex-1 text-left truncate text-base font-semibold">
                    {switching
                        ? "Switching..."
                        : loading
                            ? "Loading..."
                            : selected
                                ? selected.name
                                : "All Businesses"}
                </span>

                <svg
                    className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""
                        }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                </svg>
            </button>

            {open && (
                <div className="absolute left-0 top-full mt-1.5 z-20 w-64 bg-white border border-gray-100 rounded-xl shadow-lg py-1 max-h-80 overflow-y-auto">
                    <button
                        onClick={() => {
                            onChange('all')
                            setOpen(false)
                        }}
                        className={`w-full flex items-center gap-2.5 text-left px-3 py-2 text-sm hover:bg-gray-50 ${selectedId === 'all' ? 'text-blue-600 font-medium' : 'text-gray-700'
                            }`}
                    >
                        <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                            </svg>
                        </span>
                        All Businesses
                    </button>

                    <div className="border-t border-gray-100 my-1" />

                    {businesses.length === 0 && (
                        <div className="px-3 py-2 text-xs text-gray-400">No businesses yet</div>
                    )}

                    {businesses.map((biz) => {
                        const { bg, color, icon } = getBusinessIcon(biz.type)
                        const isSelected = selectedId === biz.id
                        return (
                            <button
                                key={biz.id}
                                onClick={() => {
                                    onChange(biz.id)
                                    setOpen(false)
                                }}
                                className={`w-full flex items-center gap-2.5 text-left px-3 py-2 text-sm hover:bg-gray-50 ${isSelected ? 'text-blue-600 font-medium' : 'text-gray-700'
                                    }`}
                            >
                                <span className={`w-6 h-6 rounded-md ${biz.logoUrl ? 'bg-gray-100' : bg} ${color} flex items-center justify-center shrink-0 overflow-hidden`}>
                                    {biz.logoUrl ? (
                                        <img src={biz.logoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        icon
                                    )}
                                </span>
                                <span className="flex-1 truncate">{biz.name}</span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export type { BusinessOption }