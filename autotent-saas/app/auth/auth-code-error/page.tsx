'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AuthErrorPage() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')
    const code = searchParams.get('code')

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
            <Card className="max-w-md w-full border-red-200 dark:border-red-900/50 shadow-lg">
                <CardHeader>
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4 mx-auto">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <CardTitle className="text-center text-red-600 dark:text-red-400">
                        Authentication Error
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    <p className="text-gray-600 dark:text-gray-300">
                        There was a problem logging you in.
                    </p>

                    {(error || code) && (
                        <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded-md text-xs font-mono break-all text-left">
                            {error && <p>Error: {error}</p>}
                            {code && <p>Code: {code}</p>}
                        </div>
                    )}

                    <div className="pt-4">
                        <Link href="/login">
                            <Button className="w-full">
                                Return to Login
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
