import { useState } from 'react'
import Layout from '../../components/Layout'
import ContactModal from './ContactModal'

interface Creator {
    name: string
    role: string
    description: string
    initials: string
    github: string
    linkedin: string
}

const creators: Creator[] = [
    {
        name: 'Hamza Zeeshan',
        role: 'Frontend Developer',
        description:
            'Designed and developed the complete frontend interface using React, TypeScript and Tailwind CSS.',
        initials: 'HZ',
        github: 'https://github.com/hamzaTheZeeshan',
        linkedin: 'https://www.linkedin.com/in/hamza-zeeshan-0a1407332/',
    },
    {
        name: 'Habib Ahmed ',
        role: 'Backend Developer',
        description:
            'Developed the backend APIs, authentication system, database structure and business logic.',
        initials: 'HA',
        github: 'https://github.com/Habib332',
        linkedin: 'https://www.linkedin.com/in/habibahmed5ba3004/',
    },
]

export default function AboutTheCreatorsPage() {
    const [showContactModal, setShowContactModal] = useState<boolean>(false)

    return (
        <Layout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    About the Creators
                </h1>
            </div>

            <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                    Meet the Creators
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    The team responsible for designing and building Receiptly.
                </p>
            </div>
            <div className="space-y-5 mb-8">
                {creators.map((creator: Creator) => (
                    <div
                        key={creator.name}
                        className="border border-gray-100 rounded-2xl p-6 hover:border-blue-200 transition-colors"
                    >
                        <div className="flex flex-col md:flex-row md:items-center gap-5">
                            <div
                                className="w-16 h-16 rounded-full bg-blue-100
                                flex items-center justify-center shrink-0"
                            >
                                <span className="text-xl font-bold text-blue-600">
                                    {creator.initials}
                                </span>
                            </div>
                            <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h3 className="text-xl font-semibold text-gray-900">
                                        {creator.name}
                                    </h3>
                                    <span
                                        className="text-[11px] uppercase tracking-widest
                                        font-semibold text-blue-600 bg-blue-50
                                        rounded-full px-3 py-1"
                                    >
                                        {creator.role}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-3 leading-7 max-w-2xl">
                                    {creator.description}
                                </p>
                                <div className="flex flex-wrap gap-3 mt-5">
                                    <a
                                        href={creator.github}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2
                                        border border-gray-200
                                        hover:border-gray-300
                                        rounded-lg
                                        px-4
                                        py-2
                                        text-sm
                                        font-medium
                                        text-gray-700
                                        transition-colors"
                                    >
                                        <svg
                                            className="w-4 h-4"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M12 .5C5.65.5.5 5.65.5 12A11.5 11.5 0 008.35 22.93c.58.11.79-.25.79-.56v-2.18c-3.19.69-3.86-1.36-3.86-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.69.08-.69 1.16.08 1.76 1.19 1.76 1.19 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.55-.29-5.22-1.28-5.22-5.69 0-1.26.45-2.3 1.18-3.11-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.19a11.05 11.05 0 015.77 0c2.19-1.5 3.16-1.19 3.16-1.19.63 1.58.24 2.75.12 3.04.73.81 1.18 1.85 1.18 3.11 0 4.42-2.68 5.39-5.24 5.68.41.36.78 1.08.78 2.18v3.23c0 .31.21.68.8.56A11.5 11.5 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
                                        </svg>
                                        GitHub
                                    </a>
                                    <a
                                        href={creator.linkedin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2
                                        bg-blue-600
                                        hover:bg-blue-700
                                        text-white
                                        rounded-lg
                                        px-4
                                        py-2
                                        text-sm
                                        font-medium
                                        transition-colors"
                                    >
                                        <svg
                                            className="w-4 h-4"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M4.98 3.5C4.98 4.6 4.1 5.5 3 5.5S1 4.6 1 3.5 1.9 1.5 3 1.5s1.98.9 1.98 2zM1.5 8h3V22h-3V8zm7 0h2.88v1.91h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.59V22h-3v-7.21c0-1.72-.03-3.94-2.4-3.94-2.41 0-2.78 1.88-2.78 3.82V22h-3V8z" />
                                        </svg>
                                        LinkedIn
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-blue-50/60 rounded-2xl px-8 py-8 overflow-hidden">
                <div className="max-w-3xl">
                    <p className="text-xs uppercase tracking-[0.25em] text-blue-600 font-semibold mb-2">
                        THANK YOU
                    </p>
                    <h2 className="text-3xl font-bold text-gray-900">
                        Thanks for using
                        <span className="text-blue-600"> Receiptify.</span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-4 leading-7">
                        We built Receiptify with one goal in mind to make receipt
                        management faster, cleaner and easier for businesses of every
                        size. We hope this platform helps you spend less time managing
                        paperwork and more time growing your business.
                    </p>
                    <div className="flex flex-wrap gap-4 mt-8">
                        <button
                            onClick={() => setShowContactModal(true)}
                            className="inline-flex items-center gap-2
                            bg-blue-600
                            hover:bg-blue-700
                            transition-colors
                            text-white
                            rounded-lg
                            px-5
                            py-2.5
                            font-semibold"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.8}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M21.75 6.75v10.5A2.25 2.25 0 0119.5 19.5h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75m19.5 0l-9.75 6.75L2.25 6.75"
                                />
                            </svg>
                            Contact Us
                        </button>
                        <a
                            href="/about-receiptify"
                            className="inline-flex items-center gap-2
                            border border-gray-200
                            hover:border-blue-300
                            hover:text-blue-600
                            transition-colors
                            rounded-lg
                            px-5
                            py-2.5
                            text-gray-700
                            font-semibold"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.8}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                                />
                            </svg>
                            Learn More about Receiptify
                        </a>
                    </div>
                </div>
            </div>

            {showContactModal && (
                <ContactModal
                    onClose={() => setShowContactModal(false)}
                />
            )}
        </Layout>
    )
}