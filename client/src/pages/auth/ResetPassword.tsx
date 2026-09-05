import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import illustration from '../../assets/sign-up.png'
import ReceiptLogo from '../../logo/MainLogo'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function ResetPassword() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token') || ''

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')

        if (!token) {
            setError('This reset link is missing or invalid. Please request a new one.')
            return
        }

        if (!password || !confirmPassword) {
            setError('Please fill in both fields')
            return
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)

        try {
            const res = await fetch(`${API_BASE_URL}/password-reset/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password }),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'This reset link is invalid or has expired')
            }

            setSuccess(true)
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
                            {success ? 'Password reset' : 'Set a new password'}
                        </h1>

                        <p className="text-xs text-gray-500 mt-2 mb-5">
                            {success
                                ? 'Your password has been updated. You can now sign in.'
                                : 'Choose a new password for your account.'}
                        </p>
                    </div>

                    {success ? (
                        <div className="w-full max-w-sm mx-auto lg:mx-0">
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

                            {!token && (
                                <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                    No reset token found in the link. Please use the link from your email, or{' '}
                                    <Link to="/forgot-password" className="font-medium underline">
                                        request a new one
                                    </Link>
                                    .
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
                                            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                                        />
                                    </svg>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="New password"
                                        className="bg-transparent flex-1 text-xs text-gray-700 outline-none placeholder:text-gray-400 tracking-widest h-full"
                                    />
                                </div>

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
                                            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.286z"
                                        />
                                    </svg>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        className="bg-transparent flex-1 text-xs text-gray-700 outline-none placeholder:text-gray-400 tracking-widest h-full"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 transition-colors text-white text-xs font-semibold rounded-lg min-h-[44px] mt-2"
                                >
                                    {loading ? 'Resetting...' : 'Reset password'}
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