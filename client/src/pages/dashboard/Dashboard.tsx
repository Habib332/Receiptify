import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

type Receipt = {
    id: string
    businessId: string
    businessName: string
    receiptNumber: string
    date: string
    amount: string
    category: string
}

type Business = {
    id: string
    name: string
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

export default function Dashboard() {
    const [receipts, setReceipts] = useState<Receipt[]>([])
    const [businesses, setBusinesses] = useState<Business[]>([])
    const [selectedBusinessId, setSelectedBusinessId] = useState('all')

    const [loading, setLoading] = useState(false)
    const [businessesLoading, setBusinessesLoading] = useState(false)
    const [error, setError] = useState('')

    // Populate the business selector
    const fetchBusinesses = useCallback(async () => {
        setBusinessesLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/business`, {
                method: 'GET',
                headers: authHeaders(),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to load businesses')
            }

            setBusinesses(data.data || [])
        } catch (err) {
            // Selector failure shouldn't block the page; surface silently in console
            console.error(err)
        } finally {
            setBusinessesLoading(false)
        }
    }, [])

    // Fetch receipts, optionally filtered by businessId
    const fetchReceipts = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const params = new URLSearchParams()
            if (selectedBusinessId !== 'all') params.set('businessId', selectedBusinessId)

            const res = await fetch(`${API_BASE_URL}/receipts?${params.toString()}`, {
                method: 'GET',
                headers: authHeaders(),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to load receipts')
            }

            setReceipts(data.data || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }, [selectedBusinessId])

    useEffect(() => {
        fetchBusinesses()
    }, [fetchBusinesses])

    useEffect(() => {
        fetchReceipts()
    }, [fetchReceipts])

    const handleDelete = async (id: string) => {
        setError('')
        // Optimistic update
        const prevReceipts = receipts
        setReceipts((prev) => prev.filter((r) => r.id !== id))

        try {
            const res = await fetch(`${API_BASE_URL}/receipts/${id}`, {
                method: 'DELETE',
                headers: authHeaders(),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to delete receipt')
            }
        } catch (err) {
            // Roll back on failure
            setReceipts(prevReceipts)
            setError(err instanceof Error ? err.message : 'Something went wrong')
        }
    }

    return (
        <Layout>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
                    <p className="text-sm text-gray-400 mt-1">View and manage receipts across your businesses.</p>
                </div>
                <button className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                    <span className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                </button>
            </div>

            {error && (
                <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                </div>
            )}

            {/* Business selector */}
            <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                    <select
                        value={selectedBusinessId}
                        onChange={(e) => setSelectedBusinessId(e.target.value)}
                        disabled={businessesLoading}
                        className="appearance-none border border-gray-200 rounded-lg pl-9 pr-8 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 bg-white min-w-[220px]"
                    >
                        <option value="all">All Receipts</option>
                        {businesses.map((biz) => (
                            <option key={biz.id} value={biz.id}>
                                {biz.name}
                            </option>
                        ))}
                    </select>
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25M12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </div>
            </div>

            <h3 className="text-sm font-bold text-gray-900 mb-3">
                {selectedBusinessId === 'all' ? 'All Receipts' : businesses.find((b) => b.id === selectedBusinessId)?.name ?? 'Receipts'}
                {' '}({receipts.length})
            </h3>

            {/* Receipts table */}
            <div className="border border-gray-100 rounded-2xl overflow-hidden mb-8">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                            <th className="font-medium px-5 py-3">Receipt</th>
                            <th className="font-medium px-5 py-3">Date</th>
                            <th className="font-medium px-5 py-3">Amount</th>
                            <th className="font-medium px-5 py-3">Category</th>
                            <th className="font-medium px-5 py-3">Business</th>
                            <th className="px-5 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {loading && receipts.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                                    Loading receipts...
                                </td>
                            </tr>
                        )}

                        {!loading && receipts.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                                    No receipts found.
                                </td>
                            </tr>
                        )}

                        {receipts.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6 15.75h-6a2.25 2.25 0 01-2.25-2.25V6a2.25 2.25 0 012.25-2.25h4.5l5.25 5.25v9.75a2.25 2.25 0 01-2.25 2.25z" />
                                            </svg>
                                        </div>
                                        <span className="text-gray-700">{row.receiptNumber}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3.5 text-gray-500">{row.date}</td>
                                <td className="px-5 py-3.5 text-gray-700 font-medium">{row.amount}</td>
                                <td className="px-5 py-3.5">
                                    <span className="inline-block text-xs font-medium text-green-700 bg-green-50 rounded-full px-2.5 py-1">
                                        {row.category}
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-gray-500">{row.businessName}</td>
                                <td className="px-5 py-3.5 text-right">
                                    <button
                                        onClick={() => handleDelete(row.id)}
                                        className="text-gray-300 hover:text-red-500 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Layout>
    )
}