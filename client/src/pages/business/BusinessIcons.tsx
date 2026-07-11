// Maps a business "type" string (from API) to an icon + colors.
// Add more entries here as new business types show up from the backend.

type IconConfig = {
    bg: string
    color: string
    icon: React.ReactNode
}

const groceryIcon = (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 1.887-4.412 2.276-6.176a.75.75 0 00-.734-.907H5.606M7.5 14.25L5.106 5.272M6 18.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
)

const restaurantIcon = (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25h15M4.5 8.25c0-1.036.84-1.875 1.875-1.875h11.25c1.035 0 1.875.84 1.875 1.875M4.5 8.25v10.875c0 1.035.84 1.875 1.875 1.875h11.25c1.035 0 1.875-.84 1.875-1.875V8.25M15.75 3v1.5" />
    </svg>
)

const pharmacyIcon = (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 3h6m-7.5 6.75h9a2.25 2.25 0 002.25-2.25v-15a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 005.25 4.5v15a2.25 2.25 0 002.25 2.25z" />
    </svg>
)

const retailIcon = (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25M12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
)

const serviceIcon = (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26" />
    </svg>
)

const genericIcon = (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387" />
    </svg>
)

const iconMap: Record<string, IconConfig> = {
    Grocery: { bg: 'bg-green-50', color: 'text-green-600', icon: groceryIcon },
    Restaurant: { bg: 'bg-orange-50', color: 'text-orange-500', icon: restaurantIcon },
    Pharmacy: { bg: 'bg-purple-50', color: 'text-purple-500', icon: pharmacyIcon },
    Retail: { bg: 'bg-blue-50', color: 'text-blue-600', icon: retailIcon },
    Service: { bg: 'bg-pink-50', color: 'text-pink-500', icon: serviceIcon },
}

const fallback: IconConfig = { bg: 'bg-gray-100', color: 'text-gray-500', icon: genericIcon }

export function getBusinessIcon(type: string): IconConfig {
    return iconMap[type] || fallback
}

export const businessTypes = Object.keys(iconMap)