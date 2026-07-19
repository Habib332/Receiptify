import { useState, useEffect, useCallback, useMemo } from 'react'
import Layout from '../../components/Layout'
import DashboardHeroImage from '../../assets/Dashboard.png'
import DeleteReceiptModal from './DeleteReceiptModal'
import EditReceiptModal, { type EditableReceiptFields } from './EditReceiptModal'
import BusinessSelector, { type BusinessOption } from './BusinessSelector'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ---- Types (mirror the receipts.repository.js row shape) ----
type VerificationStatus = 'pending' | 'verified' | 'rejected'
type DuplicateStatus = 'none' | 'flagged' | 'confirmed_duplicate' | 'not_duplicate'
type BusinessRole = 'owner' | 'manager' | 'staff'

type Receipt = {
    receipt_id: string
    business_id: string
    receiver_name: string | null // merchant / vendor being paid
    sender_name: string | null
    sender_bank: string | null
    receiver_bank: string | null
    transaction_reference: string | null
    amount: string | null
    currency: string
    receipt_date: string | null
    notes: string | null
    image_url: string | null
    verification_status: VerificationStatus
    duplicate_status: DuplicateStatus
    upload_status: 'draft' | 'confirmed'
    created_at: string
}

type Stats = {
    receiptCount: number
    totalSpent: number
    pendingVerification: number
    flaggedDuplicates: number
}

function getToken() {
    return sessionStorage.getItem('token')
}

function jsonHeaders() {
    const token = getToken()
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}

function formatAmount(amount: number | string | null, currency: string) {
    if (amount === null) return '—'
    const n = Number(amount)
    return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })
}

// Duplicate status drives the Status column now.
const DUPLICATE_STYLES: Record<DuplicateStatus, string> = {
    none: 'text-gray-500 bg-gray-50',
    flagged: 'text-orange-700 bg-orange-50',
    confirmed_duplicate: 'text-red-700 bg-red-50',
    not_duplicate: 'text-green-700 bg-green-50',
}

const DUPLICATE_LABELS: Record<DuplicateStatus, string> = {
    none: 'Not a duplicate',
    flagged: 'Possible duplicate',
    confirmed_duplicate: 'Confirmed duplicate',
    not_duplicate: 'Not a duplicate',
}

// Only owners/managers may edit or delete a receipt's details — staff can
// view and upload but not modify or remove existing records.
function canManageReceipts(role: BusinessRole | null) {
    return role === 'owner' || role === 'manager'
}

const PAGE_SIZE = 5

export default function Dashboard() {
    const [receipts, setReceipts] = useState<Receipt[]>([])
    // Unfiltered, all-confirmed-receipts list — used only to power the
    // "This Month" chart, so it stays stable regardless of whatever the
    // table above is filtered to.
    const [allReceipts, setAllReceipts] = useState<Receipt[]>([])
    const [stats, setStats] = useState<Stats | null>(null)

    const [loading, setLoading] = useState(false)
    const [statsLoading, setStatsLoading] = useState(false)
    const [error, setError] = useState('')

    // Business selector — "all" shows receipts across every business the
    // user belongs to; a specific id scopes everything to that business.
    const [businesses, setBusinesses] = useState<BusinessOption[]>([])
    const [businessesLoading, setBusinessesLoading] = useState(false)
    const [selectedBusinessId, setSelectedBusinessId] = useState<string | 'all'>('all')

    // Filters — kept to fields the API actually supports
    // (receipts.repository.js#searchReceiptsByBusiness). Start/end date now
    // live inside the filter panel alongside min/max amount.
    const [referenceSearch, setReferenceSearch] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [showFilterPanel, setShowFilterPanel] = useState(false)
    const [minAmount, setMinAmount] = useState('')
    const [maxAmount, setMaxAmount] = useState('')

    const [page, setPage] = useState(1)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)

    // Delete confirmation
    const [deletingReceipt, setDeletingReceipt] = useState<Receipt | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    // Edit details modal
    const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)
    const [editLoading, setEditLoading] = useState(false)

    const fetchBusinesses = useCallback(async () => {
        setBusinessesLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/business`, {
                method: 'GET',
                headers: jsonHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load businesses')
            setBusinesses(
                (data.data || [])
                    .map((b: any) => ({
                        id: b.id ?? b.business_id,
                        name: b.name,
                        type: b.type,
                        logoUrl: b.logoUrl ?? b.logo_url ?? null,
                        userRole: b.userRole ?? b.user_role ?? null,
                    }))
                    // Only businesses the user actually belongs to are
                    // relevant for a receipts filter.
                    .filter((b: BusinessOption) => !!b.userRole)
            )
        } catch (err) {
            console.error(err)
        } finally {
            setBusinessesLoading(false)
        }
    }, [])

    const fetchStats = useCallback(async () => {
        setStatsLoading(true)
        try {
            const params = new URLSearchParams()
            if (selectedBusinessId !== 'all') params.set('businessId', selectedBusinessId)
            const res = await fetch(`${API_BASE_URL}/receipts/stats?${params.toString()}`, {
                method: 'GET',
                headers: jsonHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load stats')
            setStats(data.data)
        } catch (err) {
            console.error(err)
        } finally {
            setStatsLoading(false)
        }
    }, [selectedBusinessId])

    // Unfiltered fetch (aside from business scope) — powers the "This
    // Month" chart only.
    const fetchAllReceipts = useCallback(async () => {
        try {
            const params = new URLSearchParams()
            if (selectedBusinessId !== 'all') params.set('businessId', selectedBusinessId)
            const res = await fetch(`${API_BASE_URL}/receipts?${params.toString()}`, {
                method: 'GET',
                headers: jsonHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load receipts')
            setAllReceipts(data.data || [])
        } catch (err) {
            console.error(err)
        }
    }, [selectedBusinessId])

    const fetchReceipts = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const params = new URLSearchParams()
            if (selectedBusinessId !== 'all') params.set('businessId', selectedBusinessId)
            if (referenceSearch.trim()) params.set('reference', referenceSearch.trim())
            if (dateFrom) params.set('dateFrom', dateFrom)
            if (dateTo) params.set('dateTo', dateTo)
            if (minAmount) params.set('minAmount', minAmount)
            if (maxAmount) params.set('maxAmount', maxAmount)

            const res = await fetch(`${API_BASE_URL}/receipts?${params.toString()}`, {
                method: 'GET',
                headers: jsonHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load receipts')
            setReceipts(data.data || [])
            setPage(1)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }, [selectedBusinessId, referenceSearch, dateFrom, dateTo, minAmount, maxAmount])

    useEffect(() => {
        fetchBusinesses()
    }, [fetchBusinesses])

    useEffect(() => {
        fetchStats()
        fetchAllReceipts()
    }, [fetchStats, fetchAllReceipts])

    useEffect(() => {
        const t = setTimeout(fetchReceipts, 300) // light debounce for the search box
        return () => clearTimeout(t)
    }, [fetchReceipts])

    const refreshAggregates = useCallback(() => {
        fetchStats()
        fetchAllReceipts()
    }, [fetchStats, fetchAllReceipts])

    // Role for whichever business a given receipt belongs to. When viewing
    // "All Businesses", each row can belong to a different business, so
    // this is resolved per-row rather than from a single selected role.
    const roleForBusiness = useCallback(
        (businessId: string): BusinessRole | null => {
            const biz = businesses.find((b) => b.id === businessId)
            return (biz?.userRole as BusinessRole | undefined) ?? null
        },
        [businesses]
    )

    const handleDelete = async (id: string) => {
        setError('')
        setOpenMenuId(null)
        setDeleteLoading(true)
        const prev = receipts
        setReceipts((p) => p.filter((r) => r.receipt_id !== id))
        try {
            const res = await fetch(`${API_BASE_URL}/receipts/${id}`, {
                method: 'DELETE',
                headers: jsonHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete receipt')
            refreshAggregates()
        } catch (err) {
            setReceipts(prev)
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setDeleteLoading(false)
            setDeletingReceipt(null)
        }
    }

    const handleView = async (id: string) => {
        setOpenMenuId(null)
        try {
            const res = await fetch(`${API_BASE_URL}/receipts/${id}/image-url`, {
                method: 'GET',
                headers: jsonHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load receipt image')
            window.open(data.data.signedUrl, '_blank', 'noopener,noreferrer')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not open receipt image')
        }
    }

    const handleResolveDuplicate = async (id: string, isDuplicate: boolean) => {
        setOpenMenuId(null)
        setError('')
        try {
            const res = await fetch(`${API_BASE_URL}/receipts/${id}/resolve-duplicate`, {
                method: 'PATCH',
                headers: jsonHeaders(),
                body: JSON.stringify({ isDuplicate }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to resolve duplicate')
            setReceipts((p) => p.map((r) => (r.receipt_id === id ? data.data : r)))
            refreshAggregates()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        }
    }

    const handleSaveEdit = async (id: string, fields: EditableReceiptFields) => {
        setError('')
        setEditLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/receipts/${id}`, {
                method: 'PATCH',
                headers: jsonHeaders(),
                body: JSON.stringify(fields),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update receipt')
            setReceipts((p) => p.map((r) => (r.receipt_id === id ? data.data : r)))
            refreshAggregates()
            setEditingReceipt(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setEditLoading(false)
        }
    }

    const handleExportAll = () => {
        const rows = [
            ['Date', 'Receiver', 'Sender', 'Reference', 'Amount', 'Currency', 'Duplicate Status'],
            ...receipts.map((r) => [
                r.receipt_date || '',
                r.receiver_name || '',
                r.sender_name || '',
                r.transaction_reference || '',
                r.amount || '',
                r.currency,
                r.duplicate_status,
            ]),
        ]
        const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `receipts-export-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    // ---- This Month: total + weekly spend buckets, computed client-side
    // from allReceipts since the stats endpoint has no month breakdown. ----
    const thisMonth = useMemo(() => {
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth()
        const inMonth = allReceipts.filter((r) => {
            if (!r.receipt_date) return false
            const d = new Date(r.receipt_date)
            return d.getFullYear() === year && d.getMonth() === month
        })
        const total = inMonth.reduce((sum, r) => sum + Number(r.amount || 0), 0)

        // Bucket by week-of-month (1..5) for a compact 5-bar chart.
        const buckets = [0, 0, 0, 0, 0]
        inMonth.forEach((r) => {
            const d = new Date(r.receipt_date as string)
            const week = Math.min(4, Math.floor((d.getDate() - 1) / 7))
            buckets[week] += Number(r.amount || 0)
        })
        const max = Math.max(1, ...buckets)
        const currency = inMonth[0]?.currency || 'PKR'

        return { total, buckets, max, currency, count: inMonth.length }
    }, [allReceipts])

    const totalPages = Math.max(1, Math.ceil(receipts.length / PAGE_SIZE))
    const pageReceipts = receipts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const editInitial: EditableReceiptFields | null = editingReceipt
        ? {
              receiver_name: editingReceipt.receiver_name || '',
              sender_name: editingReceipt.sender_name || '',
              transaction_reference: editingReceipt.transaction_reference || '',
              amount: editingReceipt.amount || '',
              receipt_date: editingReceipt.receipt_date ? editingReceipt.receipt_date.slice(0, 10) : '',
              notes: editingReceipt.notes || '',
          }
        : null

    return (
        <Layout>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
                    <p className="text-sm text-gray-400 mt-1">View, search and manage all your scanned receipts.</p>
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

            {/* Hero banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl px-8 py-8 mb-6 flex items-center justify-between">
                <div className="max-w-md">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        All your receipts, <span className="text-blue-600">organized.</span>
                    </h2>
                    <p className="text-sm text-gray-500 mb-5">
                        Keep track of every expense with ease. Search, filter and export your receipt data anytime.
                    </p>
                    <div className="flex items-center gap-3">
                        <a
                            href="/scan"
                            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
                        >
                            <span className="text-base leading-none">+</span> Upload Receipt
                        </a>
                        <button
                            onClick={handleExportAll}
                            className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 rounded-lg px-4 py-2.5 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            Export All
                        </button>
                    </div>
                </div>
                <div className="hidden md:flex shrink-0 w-80 h-56 items-center justify-center">
                   <img
                        src={DashboardHeroImage}
                        alt="Business owner managing businesses"
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>

            {/* Stats — Total Receipts, Total Amount, This Month */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <StatCard label="Total Receipts" value={statsLoading ? '—' : String(stats?.receiptCount ?? 0)} sub="Across your business" iconColor="blue" />
                <StatCard label="Total Amount" value={statsLoading ? '—' : formatAmount(stats?.totalSpent ?? 0, 'PKR')} sub="Across all receipts" iconColor="green" />

                {/* This Month — total + weekly mini bar chart */}
                <div className="border border-gray-100 rounded-2xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">This Month</span>
                        <span className="text-xs text-gray-300">{thisMonth.count} receipts</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{formatAmount(thisMonth.total, thisMonth.currency)}</div>
                    <div className="flex items-end gap-1 h-8 mt-1">
                        {thisMonth.buckets.map((v, i) => (
                            <div
                                key={i}
                                className="flex-1 bg-blue-400 rounded-sm"
                                style={{ height: `${Math.max(6, (v / thisMonth.max) * 100)}%` }}
                                title={`Week ${i + 1}: ${formatAmount(v, thisMonth.currency)}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Business selector + search & filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <BusinessSelector
                    businesses={businesses}
                    selectedId={selectedBusinessId}
                    onChange={setSelectedBusinessId}
                    loading={businessesLoading}
                />

                <div className="relative flex-1 min-w-[220px]">
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
                    </svg>
                    <input
                        value={referenceSearch}
                        onChange={(e) => setReferenceSearch(e.target.value)}
                        placeholder="Search by reference number..."
                        className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    />
                </div>

                <button
                    onClick={() => setShowFilterPanel((v) => !v)}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                    </svg>
                    Filter
                </button>
            </div>

            {showFilterPanel && (
                <div className="border border-gray-100 rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <label className="text-xs text-gray-500">
                        Start date
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </label>
                    <label className="text-xs text-gray-500">
                        End date
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </label>
                    <label className="text-xs text-gray-500">
                        Min amount
                        <input
                            type="number"
                            value={minAmount}
                            onChange={(e) => setMinAmount(e.target.value)}
                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </label>
                    <label className="text-xs text-gray-500">
                        Max amount
                        <input
                            type="number"
                            value={maxAmount}
                            onChange={(e) => setMaxAmount(e.target.value)}
                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </label>
                    <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                        <button
                            onClick={() => {
                                setReferenceSearch('')
                                setDateFrom('')
                                setDateTo('')
                                setMinAmount('')
                                setMaxAmount('')
                            }}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Clear all filters
                        </button>
                    </div>
                </div>
            )}

            <h3 className="text-sm font-bold text-gray-900 mb-3">
                Receipts ({receipts.length})
            </h3>

            {/* Receipts table */}
            <div className="border border-gray-100 rounded-2xl overflow-visible mb-4">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                            <th className="font-medium px-5 py-3">Date</th>
                            <th className="font-medium px-5 py-3">Receiver</th>
                            <th className="font-medium px-5 py-3">Sender</th>
                            <th className="font-medium px-5 py-3">Reference</th>
                            <th className="font-medium px-5 py-3">Amount</th>
                            <th className="font-medium px-5 py-3">Status</th>
                            <th className="font-medium px-5 py-3">Screenshot</th>
                            <th className="px-5 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {loading && receipts.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">
                                    Loading receipts...
                                </td>
                            </tr>
                        )}

                        {!loading && receipts.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">
                                    No receipts found.
                                </td>
                            </tr>
                        )}

                        {pageReceipts.map((row) => {
                            const role = roleForBusiness(row.business_id)
                            const canManage = canManageReceipts(role)
                            return (
                                <tr key={row.receipt_id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-5 py-3.5 text-gray-500">{formatDate(row.receipt_date)}</td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6 15.75h-6a2.25 2.25 0 01-2.25-2.25V6a2.25 2.25 0 012.25-2.25h4.5l5.25 5.25v9.75a2.25 2.25 0 01-2.25 2.25z" />
                                                </svg>
                                            </div>
                                            <span className="text-gray-700">{row.receiver_name || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-gray-700">{row.sender_name || 'Unknown'}</td>
                                    <td className="px-5 py-3.5 text-gray-500">{row.transaction_reference || '—'}</td>
                                    <td className="px-5 py-3.5 text-gray-700 font-medium">{formatAmount(row.amount, row.currency)}</td>
                                    <td className="px-5 py-3.5">
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 ${DUPLICATE_STYLES[row.duplicate_status]}`}>
                                            {DUPLICATE_LABELS[row.duplicate_status]}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <button
                                            onClick={() => handleView(row.receipt_id)}
                                            disabled={!row.image_url}
                                            title={row.image_url ? 'View screenshot' : 'No screenshot attached'}
                                            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            View Screenshot
                                        </button>
                                    </td>
                                    <td className="px-5 py-3.5 text-right relative">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setOpenMenuId(openMenuId === row.receipt_id ? null : row.receipt_id)}
                                                className="text-gray-300 hover:text-gray-600 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 21a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                                                </svg>
                                            </button>
                                        </div>

                                        {openMenuId === row.receipt_id && (
                                            <div className="absolute right-5 top-11 z-10 w-52 bg-white border border-gray-100 rounded-xl shadow-lg py-1 text-left">
                                                {canManage && (
                                                    <button
                                                        onClick={() => {
                                                            setOpenMenuId(null)
                                                            setEditingReceipt(row)
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                                                    >
                                                        Edit details
                                                    </button>
                                                )}

                                                {row.duplicate_status === 'flagged' && (
                                                    <button
                                                        onClick={() => handleResolveDuplicate(row.receipt_id, false)}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                                                    >
                                                        Unflag as duplicate
                                                    </button>
                                                )}

                                                {canManage && (
                                                    <>
                                                        <div className="border-t border-gray-100 my-1" />
                                                        <button
                                                            onClick={() => {
                                                                setOpenMenuId(null)
                                                                setDeletingReceipt(row)
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                                                        >
                                                            Delete receipt
                                                        </button>
                                                    </>
                                                )}

                                                {!canManage && row.duplicate_status !== 'flagged' && (
                                                    <div className="px-4 py-2 text-xs text-gray-400">No actions available</div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination — client-side, since the API returns the full
                matching set rather than a paginated page. */}
            {receipts.length > 0 && (
                <div className="flex items-center justify-between px-1 pb-8">
                    <span className="text-xs text-gray-400">
                        Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, receipts.length)} of {receipts.length} receipts
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30"
                        >
                            ‹
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs ${
                                    p === page ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30"
                        >
                            ›
                        </button>
                    </div>
                </div>
            )}

            {deletingReceipt && (
                <DeleteReceiptModal
                    receiptLabel={deletingReceipt.receiver_name || deletingReceipt.transaction_reference || 'this receipt'}
                    loading={deleteLoading}
                    onConfirm={() => handleDelete(deletingReceipt.receipt_id)}
                    onClose={() => {
                        if (!deleteLoading) setDeletingReceipt(null)
                    }}
                />
            )}

            {editingReceipt && editInitial && (
                <EditReceiptModal
                    initial={editInitial}
                    loading={editLoading}
                    onSave={(fields) => handleSaveEdit(editingReceipt.receipt_id, fields)}
                    onClose={() => {
                        if (!editLoading) setEditingReceipt(null)
                    }}
                />
            )}
        </Layout>
    )
}

function StatCard({ label, value, sub, iconColor }: { label: string; value: string; sub: string; iconColor: 'blue' | 'green' | 'amber' | 'purple' }) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-500',
        green: 'bg-green-50 text-green-500',
        amber: 'bg-amber-50 text-amber-500',
        purple: 'bg-purple-50 text-purple-500',
    }
    return (
        <div className="border border-gray-100 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors[iconColor]}`}>
                    <span className="w-2 h-2 rounded-full bg-current" />
                </div>
                <span className="text-xs text-gray-400">{label}</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-400">{sub}</div>
        </div>
    )
}