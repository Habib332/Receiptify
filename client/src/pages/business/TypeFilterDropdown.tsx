import { useEffect, useRef, useState } from 'react'
import { getBusinessIcon } from './BusinessIcons'

type TypeFilterDropdownProps = {
    value: string
    options: string[]
    onChange: (value: string) => void
}

// Custom dropdown (native <select> can't be styled beyond the basics:
// no icons per-option, no custom open/close animation, no rounded panel
// that matches the rest of the design system).
export default function TypeFilterDropdown({ value, options, onChange }: TypeFilterDropdownProps) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const allOptions = ['All Types', ...options]
    const isAllTypes = value === 'All Types'
    const activeIcon = !isAllTypes ? getBusinessIcon(value) : null

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={`flex items-center gap-2 pl-3 pr-3 py-2.5 rounded-lg border text-sm font-medium transition-colors min-w-[160px] ${
                    open
                        ? 'border-blue-300 ring-2 ring-blue-100 bg-white'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
            >
                {isAllTypes ? (
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                ) : (
                    <span className={`w-4 h-4 shrink-0 flex items-center justify-center ${activeIcon?.color}`}>
                        {activeIcon?.icon}
                    </span>
                )}
                <span className="flex-1 text-left truncate text-gray-700">{value}</span>
                <svg
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
            </button>

            {open && (
                <div className="absolute z-20 mt-2 w-64 max-h-80 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-lg shadow-gray-200/60 p-1.5 animate-[fadeIn_0.12s_ease-out]">
                    <button
                        onClick={() => {
                            onChange('All Types')
                            setOpen(false)
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isAllTypes ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                        </svg>
                        <span className="flex-1 text-left">All Types</span>
                        {isAllTypes && (
                            <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        )}
                    </button>

                    <div className="my-1 border-t border-gray-100" />

                    {options.map((opt) => {
                        const { bg, color, icon } = getBusinessIcon(opt)
                        const active = value === opt
                        return (
                            <button
                                key={opt}
                                onClick={() => {
                                    onChange(opt)
                                    setOpen(false)
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                                    active ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <span className={`w-5 h-5 rounded-md ${bg} ${color} flex items-center justify-center shrink-0 [&>svg]:w-3 [&>svg]:h-3`}>
                                    {icon}
                                </span>
                                <span className="flex-1 text-left truncate">{opt}</span>
                                {active && (
                                    <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
