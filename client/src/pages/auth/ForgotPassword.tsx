import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import illustration from '../../assets/sign-up.png'
import ReceiptLogo from '../../logo/MainLogo'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://receiptify-zeta.vercel.app/api'

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')

        if (!email) {
            setError('Please enter your email address')
            return
        }

        setLoading(true)

        try {
            const res = await fetch(`${API_BASE_URL}/password-reset/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Something went wrong')
            }

            // Backend always returns the same generic message whether or not
            // the email exists (anti-enumeration), so we just show it as-is.
            setSubmitted(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full bg-white flex items-center justify-center overflow-x-hidden p-4 py-8 sm:py-4">
            <div className="w-full max-w-4xl lg:h-full lg:max-h-[560px] flex flex-col lg:flex-row items-stretch gap-6 lg:gap-8">
                {/* Left illustration panel */}
                <div className="hidden sm:block w-full lg:w-[42%] bg-gray-100 rounded-2xl overflow-hidden relative min-h-[220px] lg:min-h-0">
                    <img
                        src={illustration}
                        alt="Person surrounded by receipts, a calculator and a coffee mug, looking stressed"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Right form panel */}
                <div className="w-full lg:w-[58%] flex flex-col justify-center px-4 sm:px-6 lg:px-8">
                    <div className="w-full max-w-sm mx-auto lg:mx-0">
                        {/* Logo */}
                        <div className="mb-5">
                            <ReceiptLogo size={48} />
                        </div>

                        {/* Heading */}
                        <h1 className="text-2xl font-bold text-gray-900">
                            Forgot your password?
                        </h1>

                        <p className="text-xs text-gray-500 mt-2 mb-5">
                            {submitted
                                ? "Check your inbox for a reset link."
                                : "Enter the email associated with your account and we'll send you a link to reset your password."}
                        </p>
                    </div>

                    {submitted ? (
                        <div className="w-full max-w-sm mx-auto lg:mx-0">
                            <div className="mb-4 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                                If an account exists for that email, a reset link has been sent.
                            </div>

                            <Link
                                to="/sign-in"
                                className="block w-full text-center bg-blue-600 hover:bg-blue-700 transition-colors text-white text-xs font-semibold rounded-lg min-h-[44px] leading-[44px]"
                            >
                                Back to sign in
                            </Link>
                        </div>
                    ) : (
                        <div className="w-full max-w-sm mx-auto lg:mx-0">
                            {error && (
                                <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-2.5">
                                <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 min-h-[44px]">
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
                                        className="bg-transparent flex-1 text-xs text-gray-700 outline-none placeholder:text-gray-400 h-full"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 transition-colors text-white text-xs font-semibold rounded-lg min-h-[44px] mt-2"
                                >
                                    {loading ? 'Sending link...' : 'Send reset link'}
                                </button>
                            </form>

                            <p className="text-xs text-gray-500 text-center mt-4">
                                Remembered your password?{' '}
                                <Link to="/sign-in" className="text-blue-600 font-medium hover:text-blue-700 transition-colors">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}