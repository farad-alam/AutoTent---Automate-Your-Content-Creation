'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, List as ListIcon, LayoutGrid, Table as TableIcon } from 'lucide-react'
import ArticleCalendarView from './article-calendar-view'
import Link from 'next/link'
import DeletePendingJobsButton from '@/components/delete-pending-jobs-button'
import EditJobDialog from '@/components/edit-job-dialog'
import DeleteJobButton from '@/components/delete-job-button'

// Re-using types or defining them here for props
type Job = {
    id: string
    keyword: string
    status: string
    scheduled_for?: string | null
    created_at: string
    project_id: string
    user_id: string
    result_title?: string | null
    result_url?: string | null
    error_message?: string | null
    model_used?: string | null
    preferred_model?: string | null
    include_images?: boolean
    include_videos?: boolean
    use_google_search_links?: boolean
    include_internal_links?: boolean
    internal_link_density?: string | null
    intent?: string
    ai_provider?: string
    sanity_author_id?: string | null
    sanity_category_id?: string | null
    inngest_queued?: boolean
}

type WebsiteContentManagerProps = {
    jobs: Job[]
    websiteId: string
    authors: any[]
    categories: any[]
    // Actions need to be passed down or imported if they are server actions that can be called from client
    // Since we are moving the table here, we need access to the action props
    updateJobAction: any
    deleteJobAction: any
    deletePendingJobsAction: any
    retryJobAction: any
}

export default function WebsiteContentManager({
    jobs,
    websiteId,
    authors,
    categories,
    updateJobAction,
    deleteJobAction,
    deletePendingJobsAction,
    retryJobAction
}: WebsiteContentManagerProps) {
    const [view, setView] = useState<'table' | 'calendar'>('table')

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Articles for this Website
                </h3>

                {/* View Toggles */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button
                        onClick={() => setView('table')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'table'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <ListIcon className="h-4 w-4" />
                        List
                    </button>
                    <button
                        onClick={() => setView('calendar')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'calendar'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <CalendarIcon className="h-4 w-4" />
                        Calendar
                    </button>
                </div>
            </div>

            {view === 'calendar' ? (
                <ArticleCalendarView jobs={jobs} />
            ) : (
                <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                        <span className="text-sm text-gray-500">
                            Showing {jobs.length} articles
                        </span>
                        {jobs?.some(job => job.status === 'pending') && (
                            <DeletePendingJobsButton action={deletePendingJobsAction} />
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Topic</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Preferred Model</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Used Model</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-800">
                                {jobs?.map((job) => (
                                    <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                        <td className="px-6 py-4 font-medium">{job.keyword}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                job.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                    job.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {job.status === 'scheduled' && job.scheduled_for
                                                    ? `Scheduled: ${new Date(job.scheduled_for).toLocaleString()}`
                                                    : job.status
                                                }
                                            </span>
                                            {job.status === 'failed' && job.error_message && (
                                                <div className="mt-1 text-xs text-red-600">
                                                    {job.error_message}
                                                </div>
                                            )}
                                            {job.status === 'failed' && (
                                                <form action={retryJobAction} className="inline ml-2">
                                                    <input type="hidden" name="jobId" value={job.id} />
                                                    <button type="submit" className="text-xs text-purple-600 hover:underline">Retry</button>
                                                </form>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {job.preferred_model ? (
                                                <span className="px-2 py-1 text-xs font-mono bg-blue-50 text-blue-700 rounded border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                                    {job.preferred_model}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-mono bg-gray-50 text-gray-600 rounded border border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
                                                    Auto
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {job.model_used ? (
                                                <span className="px-2 py-1 text-xs font-mono bg-green-50 text-green-700 rounded border border-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                                                    {job.model_used}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {job.status === 'completed' && (
                                                <Link
                                                    href={`/dashboard/preview/${job.id}`}
                                                    className="text-sm font-medium text-purple-600 hover:text-purple-700"
                                                >
                                                    View Content →
                                                </Link>
                                            )}
                                            {job.status === 'scheduled' && (
                                                <div className="flex items-center gap-2">
                                                    <EditJobDialog
                                                        job={job}
                                                        websiteId={websiteId}
                                                        authors={authors || []}
                                                        categories={categories || []}
                                                        updateJob={updateJobAction}
                                                    />
                                                    <DeleteJobButton
                                                        jobId={job.id}
                                                        action={deleteJobAction}
                                                    />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(job.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                                {(!jobs || jobs.length === 0) && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            No articles yet. Connect CMS to start generating!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    )
}
