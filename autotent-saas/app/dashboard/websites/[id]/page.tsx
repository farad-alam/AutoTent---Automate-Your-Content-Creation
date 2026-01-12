import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { inngest } from '@/inngest/client'
import DashboardSidebar from '@/components/dashboard-sidebar'
import DeletePendingJobsButton from '@/components/delete-pending-jobs-button'
import WebsiteSettings from '@/components/website-settings'

// Types
type PageProps = {
    params: Promise<{ id: string }>
}

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

    // ACTIONS
    async function updateCMS(formData: FormData) {
        'use server'
        // Need to recreate supabase client in action
        const { createClient } = await import('@/lib/supabase-server')
        const supabase = await createClient()

        const projectId = formData.get('projectId') as string
        const dataset = formData.get('dataset') as string
        const token = formData.get('token') as string

        await supabase.from('projects').update({
            sanity_project_id: projectId,
            sanity_dataset: dataset,
            sanity_token: token
        }).eq('id', id)

        redirect(`/dashboard/websites/${id}`)
    }

    async function createJob(formData: FormData) {
        'use server'
        // Need to recreate supabase client in action
        const { createClient } = await import('@/lib/supabase-server')
        const { inngest } = await import('@/inngest/client')
        const supabase = await createClient()

        // Re-authenticate user inside action
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const scheduledFor = formData.get('scheduledFor') as string
        const keyword = formData.get('keyword') as string
        const projectId = id // Use URL param ID

        const status = scheduledFor ? 'scheduled' : 'pending'

        const { data: job, error } = await supabase.from('jobs').insert({
            user_id: user.id,
            project_id: projectId,
            keyword,
            status,
            scheduled_for: scheduledFor || null
        }).select().single()

        if (error) console.error(error)

        if (job) {
            try {
                await inngest.send({
                    name: "job/created",
                    data: {
                        jobId: job.id,
                        projectId: projectId,
                        keyword: keyword,
                        scheduledFor: scheduledFor || null
                    }
                })
            } catch (inngestError: any) {
                console.error('Inngest trigger failed:', inngestError.message)
                await supabase.from('jobs').update({
                    status: 'failed',
                    error_message: 'Failed to trigger background worker.'
                }).eq('id', job.id)
            }
        }
        redirect(`/dashboard/websites/${id}`)
    }

    async function retryJob(formData: FormData) {
        'use server'
        const { createClient } = await import('@/lib/supabase-server')
        const { inngest } = await import('@/inngest/client')
        const supabase = await createClient()

        const jobId = formData.get('jobId') as string
        const { data: job } = await supabase.from('jobs').select('*').eq('id', jobId).single()

        if (!job) return

        await supabase.from('jobs').update({ status: 'pending', error_message: null }).eq('id', jobId)

        try {
            await inngest.send({
                name: "job/created",
                data: { jobId: job.id, projectId: job.project_id, keyword: job.keyword }
            })
        } catch (error) {
            await supabase.from('jobs').update({ status: 'failed', error_message: 'Retry failed' }).eq('id', jobId)
        }
        redirect(`/dashboard/websites/${id}`)
    }

    async function deletePendingJobs(formData: FormData) {
        'use server'
        const { createClient } = await import('@/lib/supabase-server')
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            await supabase
                .from('jobs')
                .delete()
                .eq('user_id', user.id)
                .eq('project_id', id)
                .eq('status', 'pending')
        }
        redirect(`/dashboard/websites/${id}`)
    }

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

                    {/* CMS Status / Settings Component (Replaces static status pill) */}
                    {/* This component handles its own display state (Status Badge + Edit Button OR Edit Form) */}
                </div>

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
                            dataset: website.sanity_dataset
                        }}
                        action={updateCMS}
                    />
                </div>

                {/* Article Generator (Only if connected) */}
                {isCMSConnected && (
                    <Card className="mb-8 border-gray-200 dark:border-gray-700">
                        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-2xl">🚀</span>
                                Generate Article for {website.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form action={createJob} className="flex gap-4">
                                <Input
                                    name="keyword"
                                    placeholder="Enter Article Topic / Keyword (e.g. Best Coffee Machines)"
                                    required
                                    className="flex-1"
                                />
                                <Input
                                    type="datetime-local"
                                    name="scheduledFor"
                                    className="w-auto"
                                    min={new Date().toISOString().slice(0, 16)}
                                />
                                <Button type="submit" className="gradient-primary text-white border-0 px-8">
                                    Generate
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Articles List */}
                <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                        <h3 className="font-semibold">Articles for this Website</h3>
                        {jobs?.some(job => job.status === 'pending') && (
                            <DeletePendingJobsButton action={deletePendingJobs} />
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Topic</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
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
                                            {job.status === 'failed' && (
                                                <form action={retryJob} className="inline ml-2">
                                                    <input type="hidden" name="jobId" value={job.id} />
                                                    <button type="submit" className="text-xs text-purple-600 hover:underline">Retry</button>
                                                </form>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {job.status === 'completed' ? (
                                                <Link
                                                    href={`/dashboard/preview/${job.id}`}
                                                    className="text-sm font-medium text-purple-600 hover:text-purple-700"
                                                >
                                                    View Content →
                                                </Link>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(job.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                                {(!jobs || jobs.length === 0) && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                            No articles yet. Connect CMS to start generating!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </main>
        </div>
    )
}
