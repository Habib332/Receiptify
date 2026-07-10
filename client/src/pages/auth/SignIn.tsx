import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import illustration from '../../assets/sign-in.png'
import ReceiptLogo from '../../logo/MainLogo'
import GoogleLogo from '../../logo/GoogleLogo'
import AppleLogo from '../../logo/AppleLogo'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function SignIn() {
    const navigate = useNavigate()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')

        if (!email || !password) {
            setError('Please fill in all fields')
            return
        }

        setLoading(true)

        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Login failed')
            }

            const token = data.data?.token
            const user = data.data?.user

            if (token) {
                sessionStorage.setItem('token', token)
            }
            if (user) {
                sessionStorage.setItem('user', JSON.stringify(user))
            }

            navigate('/select-business')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setLoading(false)
        }
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
                            Sign in
                        </h1>

                        <p className="text-xs text-gray-500 mt-2 mb-5">
                            Sign in with Open account
                        </p>

                        {/* Social Login */}
                        <div className="grid grid-cols-2 gap-2.5 mb-4">
                            <button
                                type="button"
                                className="flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <GoogleLogo />
                                Google
                            </button>

                            <button
                                type="button"
                                className="flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <AppleLogo />
                                Apple ID
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-[11px] text-gray-400">Or continue with email address</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {error && (
                        <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}

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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 transition-colors text-white text-xs font-semibold rounded-lg py-2.5 mt-2"
                        >
                            {loading ? 'Signing in...' : 'Start tracking'}
                        </button>
                    </form>

                    <p className="text-xs text-gray-500 text-center mt-4">
                        Don't have an account?{' '}
                        <a href="/sign-up" className="text-blue-600 font-medium hover:text-blue-700 transition-colors">
                            Sign up
                        </a>
                    </p>

                </div>
            </div>
        </div>
    )
}