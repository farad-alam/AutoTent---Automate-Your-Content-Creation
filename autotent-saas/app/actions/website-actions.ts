'use server'

import { createClient } from '@/lib/supabase-server'
import { inngest } from '@/inngest/client'
import { redirect } from 'next/navigation'

export async function updateCMS(id: string, formData: FormData) {
    const supabase = await createClient()

    const projectId = formData.get('projectId') as string
    const dataset = formData.get('dataset') as string
    const token = formData.get('token') as string
    const geminiApiKey = formData.get('geminiApiKey') as string
    const geminiApiKeyLabel = formData.get('geminiApiKeyLabel') as string
    const sanityApiTokenLabel = formData.get('sanityApiTokenLabel') as string
    const websiteName = formData.get('websiteName') as string
    const websiteUrl = formData.get('websiteUrl') as string

    const updates: any = {
        sanity_project_id: projectId,
        sanity_dataset: dataset,
        gemini_api_key_label: geminiApiKeyLabel,
        sanity_api_token_label: sanityApiTokenLabel,
        name: websiteName,
        url: websiteUrl
    }

    if (token && token.trim()) updates.sanity_token = token.trim()
    if (geminiApiKey && geminiApiKey.trim()) updates.gemini_api_key = geminiApiKey.trim()

    await supabase.from('projects').update(updates).eq('id', id)

    // Using revalidatePath is better than redirect usually, but keeping redirect for consistency with old code
    redirect(`/dashboard/websites/${id}`)
}

export async function createJob(id: string, formData: FormData) {
    const supabase = await createClient()

    // Re-authenticate user inside action
    const { data: { user } = {} } = await supabase.auth.getUser()
    if (!user) return

    const scheduledFor = formData.get('scheduledFor') as string
    const keyword = formData.get('keyword') as string
    const authorId = formData.get('authorId') as string
    const categoryId = formData.get('categoryId') as string
    const includeImages = formData.get('includeImages') === 'on'
    const includeVideos = formData.get('includeVideos') === 'on'
    const useGoogleSearchLinks = formData.get('useGoogleSearchLinks') === 'on'
    const intent = formData.get('intent') as string || 'informational'
    const projectId = id

    const status = scheduledFor ? 'scheduled' : 'pending'

    const { data: job, error } = await supabase.from('jobs').insert({
        user_id: user.id,
        project_id: projectId,
        keyword,
        status,
        intent,
        scheduled_for: scheduledFor || null,
        sanity_author_id: authorId || null,
        sanity_category_id: categoryId || null,
        include_images: includeImages,
        include_videos: includeVideos,
        use_google_search_links: useGoogleSearchLinks
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

export async function retryJob(formData: FormData) {
    const supabase = await createClient()

    // Auth check although job check implicitly secures it (can only access own jobs if RLS is on, but safer to check)
    // Actually retryJob takes jobId, we read the job and get project_id from it to redirect.

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

    // Redirect to the project page belonging to the job
    redirect(`/dashboard/websites/${job.project_id}`)
}

export async function deletePendingJobs(id: string) {
    const supabase = await createClient()
    const { data: { user } = {} } = await supabase.auth.getUser()

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
