import { useState } from 'react'
import Layout from '../../components/Layout'
import { getBusinessIcon, businessTypes } from './BusinessIcons'
import AddBusinessModal from './AddBusinessModal'

type Business = {
    id: string
    name: string
    type: string
    address: string
    phone: string
    receipts: number
    totalSpent: string
}

// TODO: replace with data fetched from API
const initialBusinesses: Business[] = [
    { id: '1', name: 'Metro Store', type: 'Grocery', address: 'Main Boulevard, Lahore', phone: '+92 300 1234567', receipts: 42, totalSpent: 'PKR 18,750' },
    { id: '2', name: 'Coffee Corner', type: 'Restaurant', address: 'Johar Town, Lahore', phone: '+92 321 9876543', receipts: 28, totalSpent: 'PKR 12,450' },
    { id: '3', name: 'Health Plus Pharmacy', type: 'Pharmacy', address: 'Model Town, Lahore', phone: '+92 345 6543210', receipts: 18, totalSpent: 'PKR 6,850' },
]

const overviewStats = [
    { label: 'Total Businesses', value: '8', sub: 'Saved', bg: 'bg-blue-50', color: 'text-blue-600' },
    { label: 'Most Used', value: 'Metro Store', sub: '42 receipts', bg: 'bg-green-50', color: 'text-green-600' },
    { label: 'Business Types', value: '6', sub: 'Categories', bg: 'bg-orange-50', color: 'text-orange-500' },
    { label: 'Total Receipts', value: '128', sub: 'Across all businesses', bg: 'bg-purple-50', color: 'text-purple-500' },
]

export default function BusinessesPage() {
    const [businesses, setBusinesses] = useState<Business[]>(initialBusinesses)
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('All Types')
    const [showAddModal, setShowAddModal] = useState(false)

    const filtered = businesses.filter((b) => {
        const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase())
        const matchesType = typeFilter === 'All Types' || b.type === typeFilter
        return matchesSearch && matchesType
    })

    const handleAddBusiness = (data: { name: string; type: string; address: string; phone: string }) => {
        // TODO: once API is wired, refetch list instead of local insert
        setBusinesses((prev) => [
            ...prev,
            { id: String(Date.now()), receipts: 0, totalSpent: 'PKR 0', ...data },
        ])
        setShowAddModal(false)
    }

    const handleDelete = (id: string) => {
        // TODO: call DELETE API
        setBusinesses((prev) => prev.filter((b) => b.id !== id))
    }

    return (
        <Layout>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
                    <p className="text-sm text-gray-400 mt-1">Manage all your saved businesses in one place.</p>
                </div>
                <button className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                    <span className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                </button>
            </div>

            {/* Hero banner */}
            <div className="bg-blue-50/60 rounded-2xl px-8 py-8 mb-6 flex items-center justify-between overflow-hidden">
                <div className="max-w-sm">
                    <h2 className="text-2xl font-bold text-gray-900">
                        All your businesses, <span className="text-blue-600">organized</span>.
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 mb-5">
                        Search, manage, and keep track of all your businesses in one place.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold rounded-lg px-4 py-2.5"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Add Business
                    </button>
                </div>
                <div className="hidden md:block shrink-0 w-56 h-40 bg-blue-100/70 rounded-xl" />
            </div>

            {/* Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {overviewStats.map((stat) => (
                    <div key={stat.label} className="border border-gray-100 rounded-2xl p-4">
                        <div className={`w-9 h-9 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center mb-6`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25M12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                        <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* Search + filter + add */}
            <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search businesses..."
                        className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                    />
                </div>

                <div className="relative">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="appearance-none border border-gray-200 rounded-lg pl-9 pr-8 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                    >
                        <option>All Types</option>
                        {businessTypes.map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                    </svg>
                </div>

                <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold rounded-lg px-4 py-2.5 whitespace-nowrap"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Business
                </button>
            </div>

            <h3 className="text-sm font-bold text-gray-900 mb-3">
                Available Businesses ({filtered.length})
            </h3>

            {/* Business list */}
            <div className="border border-gray-100 rounded-2xl divide-y divide-gray-100 mb-4">
                {filtered.map((biz) => {
                    const { bg, color, icon } = getBusinessIcon(biz.type)
                    return (
                        <div key={biz.id} className="flex items-center gap-4 px-5 py-4">
                            <div className={`w-10 h-10 rounded-lg ${bg} ${color} flex items-center justify-center shrink-0`}>
                                {icon}
                            </div>

                            <div className="w-48 shrink-0">
                                <p className="text-sm font-semibold text-gray-900">{biz.name}</p>
                                <p className="text-xs text-gray-400">{biz.type}</p>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                    </svg>
                                    <span className="truncate">{biz.address}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                    </svg>
                                    <span>{biz.phone}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 rounded-lg px-3 py-2 shrink-0">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6 15.75h-6a2.25 2.25 0 01-2.25-2.25V6a2.25 2.25 0 012.25-2.25h4.5l5.25 5.25v9.75a2.25 2.25 0 01-2.25 2.25z" />
                                </svg>
                                <div className="leading-tight">
                                    <p className="text-sm font-semibold">{biz.receipts}</p>
                                    <p className="text-[10px] text-blue-500">Receipts</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-lg px-3 py-2 shrink-0">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="leading-tight">
                                    <p className="text-sm font-semibold">{biz.totalSpent}</p>
                                    <p className="text-[10px] text-green-500">Total Spent</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                <button className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                                <button className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => handleDelete(biz.id)}
                                    className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:text-red-600 flex items-center justify-center transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Load More */}
            <div className="flex justify-center pb-8">
                <button className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
                    Load More
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                </button>
            </div>

            {showAddModal && (
                <AddBusinessModal onClose={() => setShowAddModal(false)} onSave={handleAddBusiness} />
            )}
        </Layout>
    )
}