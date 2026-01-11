'use client'

import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const router = useRouter()
    const supabase = createClient()

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${location.origin}/auth/callback`,
            },
        })

        if (error) {
            setMessage(error.message)
        } else {
            setMessage('✅ Check your email for the magic link!')
        }
        setLoading(false)
    }

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        })

        if (error) {
            setMessage(error.message)
        }
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                                <span className="text-white font-bold text-xl">A</span>
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                AutoTent
                            </span>
                        </Link>
                        <div className="flex items-center space-x-4">
                            <span className="text-gray-600 dark:text-gray-400 text-sm">
                                Don't have an account?
                            </span>
                            <Link
                                href="/signup"
                                className="px-6 py-2 rounded-full border-2 border-purple-600 text-purple-600 font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                            >
                                Sign Up
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="flex-1 flex pt-16">
                {/* Left Panel - Branding */}
                <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12 relative overflow-hidden">
                    {/* Animated Background Blobs */}
                    <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float"></div>
                    <div className="absolute bottom-20 right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>

                    <div className="relative z-10 max-w-md text-white">
                        <div className="mb-8">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
                                <span className="text-4xl">🤖</span>
                            </div>
                            <h1 className="text-5xl font-bold mb-4">
                                Welcome Back!
                            </h1>
                            <p className="text-xl text-purple-100">
                                Continue automating your content creation with AI-powered tools
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <span className="text-sm">✓</span>
                                </div>
                                <span className="text-purple-100">AI-powered content generation</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <span className="text-sm">✓</span>
                                </div>
                                <span className="text-purple-100">Seamless Sanity CMS integration</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <span className="text-sm">✓</span>
                                </div>
                                <span className="text-purple-100">Automated publishing workflows</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Login Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-950">
                    <div className="w-full max-w-md">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold mb-2">
                                    <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                        Sign In
                                    </span>
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Access your AutoTent dashboard
                                </p>
                            </div>

                            {/* Google Sign In */}
                            <button
                                onClick={handleGoogleLogin}
                                className="w-full flex items-center justify-center space-x-3 px-6 py-3 border-2 border-gray-300 dark:border-gray-700 rounded-xl hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all mb-6"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                    Continue with Google
                                </span>
                            </button>

                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white dark:bg-gray-900 text-gray-500">
                                        Or continue with email
                                    </span>
                                </div>
                            </div>

                            {/* Email Magic Link */}
                            <form onSubmit={handleEmailLogin} className="space-y-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Email Address
                                    </label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full gradient-primary text-white font-semibold py-3 rounded-xl hover:shadow-lg transition-all border-0"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Sending magic link...
                                        </span>
                                    ) : (
                                        'Get Magic Link'
                                    )}
                                </Button>

                                {message && (
                                    <div className={`p-4 rounded-xl text-sm text-center ${message.includes('✅')
                                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                        }`}>
                                        {message}
                                    </div>
                                )}
                            </form>

                            <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                                By signing in, you agree to our{' '}
                                <Link href="/terms" className="text-purple-600 hover:text-purple-700 font-medium">
                                    Terms of Service
                                </Link>{' '}
                                and{' '}
                                <Link href="/privacy" className="text-purple-600 hover:text-purple-700 font-medium">
                                    Privacy Policy
                                </Link>
                            </p>
                        </div>

                        {/* Mobile branding */}
                        <div className="lg:hidden mt-8 text-center text-gray-600 dark:text-gray-400">
                            <p className="text-sm">Join thousands automating their content with AI</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
