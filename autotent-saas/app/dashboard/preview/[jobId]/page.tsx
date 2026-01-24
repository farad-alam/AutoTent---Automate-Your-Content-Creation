import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { createSanityClient } from '@/lib/sanity'
import DashboardSidebar from '@/components/dashboard-sidebar'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

export default async function PreviewPage({ params }: { params: { jobId: string } }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch job details
    const { data: job } = await supabase
        .from('jobs')
        .select('*, projects(*)')
        .eq('id', params.jobId)
        .single()

    if (!job) {
        return <div>Job not found</div>
    }

    // Extract document ID from result_url
    let content = null
    if (job.result_url && job.status === 'completed') {
        try {
            // Extract document ID from URL (format: ...;documentId)
            const urlParts = job.result_url.split(';')
            const documentId = urlParts[urlParts.length - 1]

            // Fetch from Sanity
            const sanityClient = createSanityClient({
                projectId: job.projects.sanity_project_id,
                dataset: job.projects.sanity_dataset,
                token: job.projects.sanity_token
            })

            content = await sanityClient.fetch(`*[_id == "${documentId}"][0]`)
        } catch (error) {
            console.error('Error fetching content:', error)
        }
    }

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
            <DashboardSidebar userEmail={user.email} />

            <main className="flex-1 ml-64 p-8">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard"
                        className="text-purple-600 hover:text-purple-700 mb-4 inline-flex items-center"
                    >
                        ← Back to Dashboard
                    </Link>
                    <h1 className="text-4xl font-bold mt-4">
                        <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                            Content Preview
                        </span>
                    </h1>
                </div>

                {/* Job Info Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Keyword</p>
                            <p className="font-semibold">{job.keyword}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Project</p>
                            <p className="font-semibold">{job.projects.name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${job.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                job.status === 'processing' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                    job.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                }`}>
                                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content Display */}
                {job.status === 'completed' && content ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
                        {/* Title */}
                        <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                            {content.title || job.result_title}
                        </h2>

                        {/* Meta */}
                        {(content.metaDescription || content.metadata?.description) && (
                            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                                <p className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-1">
                                    Meta Description
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {content.metaDescription || content.metadata?.description}
                                </p>
                            </div>
                        )}

                        {/* Slug */}
                        {content.slug && (
                            <div className="mb-6">
                                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                    URL Slug
                                </p>
                                <code className="px-3 py-1 bg-gray-100 dark:bg-gray-900 rounded text-sm">
                                    /{typeof content.slug === 'string' ? content.slug : content.slug.current}
                                </code>
                            </div>
                        )}

                        <hr className="my-6 border-gray-200 dark:border-gray-700" />

                        {/* Body Content */}
                        <div className="prose prose-lg max-w-none dark:prose-invert">
                            <ReactMarkdown
                                components={{
                                    img: ({ node, ...props }) => (
                                        <img {...props} className="rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 my-8 w-full" />
                                    ),
                                    a: ({ node, ...props }) => (
                                        <a {...props} className="text-purple-600 hover:text-purple-700 underline" target="_blank" rel="noopener noreferrer" />
                                    )
                                }}
                            >
                                {content.bodyMarkdown || (content.body && typeof content.body === 'string' ? content.body : '')}
                            </ReactMarkdown>

                            {!content.bodyMarkdown && content.body && Array.isArray(content.body) && (
                                <div className="space-y-4">
                                    {content.body.map((block: any, idx: number) => (
                                        <div key={idx}>
                                            {block.children?.map((child: any, childIdx: number) => (
                                                <p key={childIdx} className="text-gray-700 dark:text-gray-300">
                                                    {child.text}
                                                </p>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex gap-4">
                            {job.result_url && (
                                <a
                                    href={job.result_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                                >
                                    Open in Sanity Studio →
                                </a>
                            )}
                            <Link
                                href="/dashboard"
                                className="px-6 py-3 border-2 border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                ) : job.status === 'processing' ? (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-12 text-center border border-blue-200 dark:border-blue-800">
                        <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200 mb-2">
                            Generating Content...
                        </h3>
                        <p className="text-blue-700 dark:text-blue-300">
                            AI is creating your content. This may take 30-60 seconds.
                        </p>
                    </div>
                ) : job.status === 'failed' ? (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-12 text-center border border-red-200 dark:border-red-800">
                        <span className="text-6xl mb-4 block">❌</span>
                        <h3 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">
                            Generation Failed
                        </h3>
                        <p className="text-red-700 dark:text-red-300">
                            {job.error_message || 'An error occurred during content generation.'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-12 text-center border border-yellow-200 dark:border-yellow-800">
                        <span className="text-6xl mb-4 block">⏳</span>
                        <h3 className="text-xl font-bold text-yellow-900 dark:text-yellow-200 mb-2">
                            Pending
                        </h3>
                        <p className="text-yellow-700 dark:text-yellow-300">
                            Job is waiting to be processed.
                        </p>
                    </div>
                )}
            </main>
        </div>
    )
}
