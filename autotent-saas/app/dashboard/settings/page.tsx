import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardSidebar from '@/components/dashboard-sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
            <DashboardSidebar userEmail={user.email} />

            <main className="flex-1 ml-64 p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">
                        <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                            Settings
                        </span>
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage your account and preferences
                    </p>
                </div>

                <div className="max-w-4xl space-y-6">
                    {/* Account Information */}
                    <Card className="border-gray-200 dark:border-gray-700">
                        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-2xl">👤</span>
                                Account Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email Address
                                </label>
                                <Input
                                    type="email"
                                    value={user.email || ''}
                                    disabled
                                    className="bg-gray-100 dark:bg-gray-800"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Your email address is managed through your authentication provider
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    User ID
                                </label>
                                <Input
                                    value={user.id}
                                    disabled
                                    className="bg-gray-100 dark:bg-gray-800 font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Account Created
                                </label>
                                <Input
                                    value={new Date(user.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                    disabled
                                    className="bg-gray-100 dark:bg-gray-800"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Subscription */}
                    <Card className="border-gray-200 dark:border-gray-700">
                        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-2xl">💎</span>
                                Subscription
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                                <div>
                                    <p className="font-semibold text-lg">Free Plan</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Basic features with limited usage
                                    </p>
                                </div>
                                <Button className="gradient-primary text-white border-0 hover:shadow-lg">
                                    Upgrade to Pro
                                </Button>
                            </div>
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center text-sm">
                                    <span className="text-green-600 mr-2">✓</span>
                                    <span className="text-gray-600 dark:text-gray-400">5 Projects</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="text-green-600 mr-2">✓</span>
                                    <span className="text-gray-600 dark:text-gray-400">10 Content Jobs per month</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="text-green-600 mr-2">✓</span>
                                    <span className="text-gray-600 dark:text-gray-400">Email Support</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* API Keys */}
                    <Card className="border-gray-200 dark:border-gray-700">
                        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-2xl">🔑</span>
                                API Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Google Gemini API Key
                                </label>
                                <Input
                                    type="password"
                                    placeholder="Enter your Gemini API key (optional)"
                                    className="font-mono"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Provide your own API key or use shared quota
                                </p>
                            </div>
                            <Button variant="outline" className="border-gray-300 dark:border-gray-700">
                                Save API Key
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Preferences */}
                    <Card className="border-gray-200 dark:border-gray-700">
                        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-2xl">⚙️</span>
                                Preferences
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Email Notifications</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Receive email when jobs complete
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    className="w-12 h-6 rounded-full"
                                    defaultChecked
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Auto-Publish</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Automatically publish to Sanity
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    className="w-12 h-6 rounded-full"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Danger Zone */}
                    <Card className="border-red-200 dark:border-red-900/50">
                        <CardHeader className="bg-red-50 dark:bg-red-900/20">
                            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <span className="text-2xl">⚠️</span>
                                Danger Zone
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <div>
                                    <p className="font-medium mb-2">Delete Account</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        This will permanently delete your account and all associated data. This action cannot be undone.
                                    </p>
                                    <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                                        Delete My Account
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
