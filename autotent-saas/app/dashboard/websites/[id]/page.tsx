import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { inngest } from '@/inngest/client'
import DashboardSidebar from '@/components/dashboard-sidebar'
import WebsiteSettings from '@/components/website-settings'
import ArticleGeneratorForm from '@/components/article-generator-form'
import SyncSanityButton from '@/components/sync-sanity-button'
import TierToggle from '@/components/tier-toggle'
import { TopicClusterManager } from '@/components/topic-cluster-manager'

// Types
type PageProps = {
    params: Promise<{ id: string }>
}

import { updateCMS, createJob, retryJob, deletePendingJobs, updateJob, deleteJob } from '@/app/actions/website-actions'
import WebsiteContentManager from '@/components/website-content-manager'

export const dynamic = 'force-dynamic'

export default async function WebsiteDetailsPage({ params }: PageProps) {
    // Await params object
    const { id } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch Website Details
    const { data: website } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

    if (!website) redirect('/dashboard')

    // Fetch Website Articles
    const { data: jobs } = await supabase
        .from('jobs')
        .select('*')
        .eq('project_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    // Fetch Authors and Categories
    const { data: authors } = await supabase
        .from('sanity_authors')
        .select('*')
        .eq('project_id', id)
        .order('name')

    const { data: categories } = await supabase
        .from('sanity_categories')
        .select('*')
        .eq('project_id', id)
        .order('title')

    const { data: topicClusters } = await supabase
        .from('topic_clusters')
        .select('id, name')
        .eq('project_id', id)
        .order('name')

    // Bind ID to actions
    const updateCMSAction = updateCMS.bind(null, id)
    const createJobAction = createJob.bind(null, id)
    const deletePendingJobsAction = deletePendingJobs.bind(null, id)
    const updateJobAction = updateJob.bind(null, id)
    const deleteJobAction = deleteJob.bind(null, id)


    // Check if CMS is connected
    const isCMSConnected = !!website.sanity_project_id

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
            <DashboardSidebar userEmail={user.email} />

            <main className="flex-1 ml-64 p-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
                                My Websites
                            </Link>
                            <span className="text-gray-400">/</span>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {website.name}
                            </h1>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">
                            {website.url || 'No URL configured'}
                        </p>
                    </div>

                    {/* Tier Toggle */}
                    <TierToggle />
                </div>

                {/* CMS Status / Settings Component (Replaces static status pill) */}
                {/* This component handles its own display state (Status Badge + Edit Button OR Edit Form) */}

                {/* We place the settings Component here. It will render either the "CMS Connected + Edit Button" (if connected) 
                    or the "Connect CMS Form" (if not connected OR editing). 
                    Actually, to layout it correctly: 
                    The user asked for the edit option "where the cms connected button display". 
                    So let's put the component in the header area? 
                    BUT the component expands into a large form. Expanding a form inside a header flex-row might look bad.
                    
                    Better approach: 
                    Keep the Header simple (Title + maybe a static status if checking prop). 
                    OR allow the WebsiteSettings to be injected in the Flow.
                    
                    Let's place WebsiteSettings below the header. 
                    If it's connected & not editing, it shows a compact row (Status + Edit Btn).
                    If editing/not connected, it shows the Card.
                */}

                <div className="mb-8">
                    <WebsiteSettings
                        websiteId={id}
                        initialConfig={{
                            projectId: website.sanity_project_id,
                            dataset: website.sanity_dataset,
                            geminiApiKey: website.gemini_api_key,
                            groqApiKey: website.groq_api_key,
                            websiteName: website.name,
                            websiteUrl: website.url, // Passed here
                            geminiApiKeyLabel: website.gemini_api_key_label,
                            groqApiKeyLabel: website.groq_api_key_label,
                            sanityApiTokenLabel: website.sanity_api_token_label
                        }}
                        action={updateCMSAction}
                    />
                </div>

                {/* Stats Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                                {jobs?.length || 0}
                            </div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Total Articles
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                                {jobs?.filter(j => j.status === 'completed').length || 0}
                            </div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Published
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                                {jobs?.filter(j => j.status === 'scheduled').length || 0}
                            </div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Scheduled
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                            <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                                {jobs?.filter(j => j.status === 'failed').length || 0}
                            </div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Failed
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Topic Cluster Manager */}
                {isCMSConnected && (
                    <TopicClusterManager projectId={id} />
                )}

                {/* Article Generator (Only if connected) */}
                {
                    isCMSConnected && (
                        <>
                            {!website.gemini_api_key && !website.groq_api_key && (
                                <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                        ⚠ <strong>No AI API Keys Configured</strong><br />
                                        Please add at least one AI API key (Gemini or Groq) in website settings above to generate content.
                                    </p>
                                </div>
                            )}
                            <ArticleGeneratorForm
                                websiteName={website.name}
                                websiteId={id}
                                createJob={createJobAction}
                                authors={authors || []}
                                categories={categories || []}
                                preferredProvider={website.preferred_ai_provider || 'auto'}
                                hasGeminiKey={!!website.gemini_api_key}
                                hasGroqKey={!!website.groq_api_key}
                                topicClusters={topicClusters || []}
                            />
                        </>
                    )
                }

                {/* Content Manager (List/Calendar) */}
                <WebsiteContentManager
                    jobs={jobs || []}
                    websiteId={id}
                    authors={authors || []}
                    categories={categories || []}
                    updateJobAction={updateJobAction}
                    deleteJobAction={deleteJobAction}
                    deletePendingJobsAction={deletePendingJobsAction}
                    retryJobAction={retryJob}
                />
            </main >
        </div >
    )
}
