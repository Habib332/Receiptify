import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'


const overviewStats = [
    {
        label: 'Total Receipts',
        value: '128',
        sub: 'This month',
        bg: 'bg-blue-50',
        iconColor: 'text-blue-600',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6 15.75h-6a2.25 2.25 0 01-2.25-2.25V6a2.25 2.25 0 012.25-2.25h4.5l5.25 5.25v9.75a2.25 2.25 0 01-2.25 2.25z" />
            </svg>
        ),
    },
    {
        label: 'Total Amount',
        value: 'PKR 48,750',
        sub: 'This month',
        bg: 'bg-green-50',
        iconColor: 'text-green-600',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        label: 'Categories',
        value: '12',
        sub: 'Tracked',
        bg: 'bg-orange-50',
        iconColor: 'text-orange-500',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
        ),
    },
    {
        label: 'Businesses',
        value: '8',
        sub: 'Saved',
        bg: 'bg-purple-50',
        iconColor: 'text-purple-500',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25M12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
        ),
    },
]

const recentActivity = [
    { receipt: 'IMG_20240710_001', date: '10 Jul 2024', amount: 'PKR 2,450', category: 'Office Supplies', business: 'TechStore' },
]

export default function Dashboard() {
    const navigate = useNavigate()

    return (
        <Layout>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Good morning, Hamza! 👋</h1>
                    <p className="text-sm text-gray-400 mt-1">Let's turn your receipts into useful insights.</p>
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
                        Scan. <span className="text-blue-600">Analyse.</span> Organize.
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 mb-5">
                        Upload receipts, extract important data, and keep your finances in control.
                    </p>
                    <button
                        onClick={() => navigate('/scan')}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold rounded-lg px-4 py-2.5"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38 0-.753-.116-1.076-.334a2.32 2.32 0 01-.734-.847 2.29 2.29 0 01-.239-1.089 2.31 2.31 0 01.334-1.076c.19-.319.462-.573.79-.734a2.29 2.29 0 011.089-.239h13.42a2.29 2.29 0 011.089.239c.328.161.6.415.79.734.19.319.316.68.334 1.076a2.29 2.29 0 01-.239 1.089 2.32 2.32 0 01-.734.847 2.31 2.31 0 01-1.076.334 2.31 2.31 0 01-1.641-1.055M6.827 6.175L3.75 20.25h16.5L17.173 6.175M6.827 6.175h10.346" />
                            <circle cx="12" cy="13" r="2.75" />
                        </svg>
                        Scan Receipts
                    </button>
                </div>
                <div className="hidden md:block shrink-0 w-56 h-40 bg-blue-100/70 rounded-xl" />
            </div>

            {/* Overview */}
            <h3 className="text-base font-bold text-gray-900 mb-3">Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {overviewStats.map((stat) => (
                    <div key={stat.label} className="border border-gray-100 rounded-2xl p-4">
                        <div className={`w-9 h-9 rounded-lg ${stat.bg} ${stat.iconColor} flex items-center justify-center mb-6`}>
                            {stat.icon}
                        </div>
                        <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                        <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <h3 className="text-base font-bold text-gray-900 mb-3">Recent Activity</h3>
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
                        {recentActivity.map((row) => (
                            <tr key={row.receipt} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6 15.75h-6a2.25 2.25 0 01-2.25-2.25V6a2.25 2.25 0 012.25-2.25h4.5l5.25 5.25v9.75a2.25 2.25 0 01-2.25 2.25z" />
                                            </svg>
                                        </div>
                                        <span className="text-gray-700">{row.receipt}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3.5 text-gray-500">{row.date}</td>
                                <td className="px-5 py-3.5 text-gray-700 font-medium">{row.amount}</td>
                                <td className="px-5 py-3.5">
                                    <span className="inline-block text-xs font-medium text-green-700 bg-green-50 rounded-full px-2.5 py-1">
                                        {row.category}
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-gray-500">{row.business}</td>
                                <td className="px-5 py-3.5 text-right">
                                    <button className="text-gray-300 hover:text-gray-500">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 6.75a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6.75a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6.75a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
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