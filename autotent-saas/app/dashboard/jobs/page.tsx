import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardSidebar from '@/components/dashboard-sidebar'
import Link from 'next/link'

export default async function JobsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch jobs with project info
    const { data: jobs } = await supabase
        .from('jobs')
        .select('*, projects(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    const totalJobs = jobs?.length || 0
    const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0
    const processingJobs = jobs?.filter(j => j.status === 'processing').length || 0
    const failedJobs = jobs?.filter(j => j.status === 'failed').length || 0

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
            <DashboardSidebar userEmail={user.email} />

            <main className="flex-1 ml-64 p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">
                        <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                            Content Jobs
                        </span>
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Track all your content generation jobs
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Jobs</p>
                                <p className="text-3xl font-bold">{totalJobs}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                                <span className="text-2xl">⚡</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Completed</p>
                                <p className="text-3xl font-bold">{completedJobs}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl gradient-success flex items-center justify-center">
                                <span className="text-2xl">✅</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Processing</p>
                                <p className="text-3xl font-bold">{processingJobs}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl gradient-info flex items-center justify-center">
                                <span className="text-2xl">⟳</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Failed</p>
                                <p className="text-3xl font-bold">{failedJobs}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl gradient-danger flex items-center justify-center">
                                <span className="text-2xl">❌</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mb-8">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center space-x-2 px-6 py-3 gradient-primary text-white rounded-xl hover:shadow-lg transition-all"
                    >
                        <span className="text-xl">➕</span>
                        <span className="font-semibold">Create New Job</span>
                    </Link>
                </div>

                {/* Jobs Table */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold">All Jobs</h2>
                    </div>
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Keyword
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Project
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Result
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Created
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {jobs?.map((job) => (
                                <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {job.keyword}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                        {job.projects?.name}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${job.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                                job.status === 'processing' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                                    job.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                            }`}>
                                            {job.status === 'completed' && '✓ '}
                                            {job.status === 'processing' && '⟳ '}
                                            {job.status === 'failed' && '✗ '}
                                            {job.status === 'pending' && '⏳ '}
                                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {job.result_url ? (
                                            <a
                                                href={job.result_url}
                                                target="_blank"
                                                className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium hover:underline"
                                            >
                                                View in Studio →
                                            </a>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                                        {new Date(job.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {(!jobs || jobs.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="text-gray-400 dark:text-gray-600">
                                            <span className="text-4xl mb-2 block">📝</span>
                                            <p className="text-lg font-medium mb-1">No jobs yet</p>
                                            <p className="text-sm">Create your first content generation job!</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    )
}
