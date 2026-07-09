import { useState, type FormEvent } from 'react'
import illustration from '../../assets/sign-up.png'
import ReceiptLogo from '../logo/MainLogo'

function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
            />
            <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18z"
            />
            <path
                fill="#FBBC05"
                d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.05l3.02-2.33z"
            />
            <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"
            />
        </svg>
    )
}

function AppleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path
                fill="#111827"
                d="M13.13 9.44c-.02-1.86 1.52-2.75 1.59-2.8-.87-1.27-2.22-1.44-2.7-1.46-1.15-.12-2.25.68-2.83.68-.59 0-1.48-.66-2.44-.65-1.25.02-2.42.73-3.06 1.85-1.32 2.28-.34 5.66.94 7.51.63.9 1.37 1.91 2.35 1.87.94-.04 1.3-.6 2.44-.6 1.13 0 1.46.6 2.45.58 1.01-.02 1.65-.91 2.27-1.82.71-1.04 1-2.05 1.02-2.1-.02-.01-1.95-.75-1.97-2.96zM11.28 3.5c.52-.63.87-1.5.77-2.38-.75.03-1.65.5-2.19 1.12-.48.55-.9 1.44-.79 2.29.83.06 1.68-.42 2.21-1.03z"
            />
        </svg>
    )
}

export default function SignUp() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()
    }

    return (
        <div className="h-screen w-full bg-white flex items-center justify-center overflow-hidden p-4">
            <div className="w-full max-w-4xl h-full max-h-[560px] flex flex-col lg:flex-row items-stretch gap-6 lg:gap-8">
                {/* Left illustration panel */}
                <div className="w-full lg:w-[42%] bg-gray-100 rounded-2xl overflow-hidden relative min-h-[220px] lg:min-h-0">
                    <div className="absolute top-5 left-5">
                    </div>
                    <img
                        src={illustration}
                        alt="Person surrounded by receipts, a calculator and a coffee mug, looking stressed"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Right form panel */}
                <div className="w-full lg:w-[58%] flex flex-col justify-center px-2 sm:px-6 lg:px-8">
                    <div className="w-full max-w-sm mx-auto lg:mx-0">
                        {/* Logo */}
                        <div className="mb-5">
                            <ReceiptLogo size={48} />
                        </div>

                        {/* Heading */}
                        <h1 className="text-2xl font-bold text-gray-900">
                            Create an account
                        </h1>

                        <p className="text-xs text-gray-500 mt-2 mb-5">
                            Sign up with Open account
                        </p>

                        {/* Social Login */}
                        <div className="grid grid-cols-2 gap-2.5 mb-4">
                            <button
                                type="button"
                                className="flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <GoogleIcon />
                                Google
                            </button>

                            <button
                                type="button"
                                className="flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <AppleIcon />
                                Apple ID
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-[11px] text-gray-400">Or continue with email address</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-2.5">
                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2.5">
                            <svg
                                className="w-4 h-4 text-gray-400 shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.8}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                                />
                            </svg>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Full name"
                                className="bg-transparent flex-1 text-xs text-gray-700 outline-none placeholder:text-gray-400"
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2.5">
                            <svg
                                className="w-4 h-4 text-gray-400 shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.8}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                                />
                            </svg>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email address"
                                className="bg-transparent flex-1 text-xs text-gray-700 outline-none placeholder:text-gray-400"
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2.5">
                            <svg
                                className="w-4 h-4 text-gray-400 shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.8}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                                />
                            </svg>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="bg-transparent flex-1 text-xs text-gray-700 outline-none placeholder:text-gray-400 tracking-widest"
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2.5">
                            <svg
                                className="w-4 h-4 text-gray-400 shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.8}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.286z"
                                />
                            </svg>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm password"
                                className="bg-transparent flex-1 text-xs text-gray-700 outline-none placeholder:text-gray-400 tracking-widest"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white text-xs font-semibold rounded-lg py-2.5 mt-2"
                        >
                            Create account
                        </button>
                    </form>

                    <p className="text-xs text-gray-500 text-center mt-4">
                        Already have an account?{' '}
                        <a href="/sign-in" className="text-blue-600 font-medium hover:text-blue-700 transition-colors">
                            Sign in
                        </a>
                    </p>

                </div>
            </div>
        </div>
    )
}