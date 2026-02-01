'use server'

import { createClient, createServiceClient } from '@/lib/supabase-server'
import { inngest } from '@/inngest/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function updateCMS(id: string, formData: FormData) {
    const supabase = await createClient()

    const projectId = formData.get('projectId') as string
    const dataset = formData.get('dataset') as string
    const token = formData.get('token') as string
    const geminiApiKey = formData.get('geminiApiKey') as string
    const geminiApiKeyLabel = formData.get('geminiApiKeyLabel') as string
    const groqApiKey = formData.get('groqApiKey') as string
    const groqApiKeyLabel = formData.get('groqApiKeyLabel') as string
    const sanityApiTokenLabel = formData.get('sanityApiTokenLabel') as string
    const websiteName = formData.get('websiteName') as string
    const websiteUrl = formData.get('websiteUrl') as string

    const updates: any = {
        sanity_project_id: projectId,
        sanity_dataset: dataset,
        gemini_api_key_label: geminiApiKeyLabel,
        groq_api_key_label: groqApiKeyLabel,
        sanity_api_token_label: sanityApiTokenLabel,
        name: websiteName,
        url: websiteUrl
    }

    if (token && token.trim()) updates.sanity_token = token.trim()
    if (geminiApiKey && geminiApiKey.trim()) updates.gemini_api_key = geminiApiKey.trim()
    if (groqApiKey && groqApiKey.trim()) updates.groq_api_key = groqApiKey.trim()

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
    const includeInternalLinks = formData.get('includeInternalLinks') === 'on'
    const internalLinkDensity = formData.get('internalLinkDensity') as string || 'medium'
    const intent = formData.get('intent') as string || 'informational'
    const aiProvider = formData.get('aiProvider') as string || 'auto'
    const preferredModel = formData.get('preferredModel') as string || null  // Get user's preferred AI model
    const projectId = id

    const status = scheduledFor ? 'scheduled' : 'pending'

    // Determine if job should be queued immediately or wait for cron
    const shouldQueueImmediately = !scheduledFor || (() => {
        const scheduleDate = new Date(scheduledFor);
        const sixDaysFromNow = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
        return scheduleDate <= sixDaysFromNow;
    })();

    const { data: job, error } = await supabase.from('jobs').insert({
        user_id: user.id,
        project_id: projectId,
        keyword,
        status,
        intent,
        ai_provider: aiProvider,
        scheduled_for: scheduledFor || null,
        sanity_author_id: authorId || null,
        sanity_category_id: categoryId || null,
        include_images: includeImages,
        include_videos: includeVideos,
        use_google_search_links: useGoogleSearchLinks,
        include_internal_links: includeInternalLinks,
        internal_link_density: internalLinkDensity,
        preferred_model: preferredModel,  // Save user's selected model with the job
        inngest_queued: shouldQueueImmediately  // Mark as queued if sending to Inngest now
    }).select().single()

    if (error) console.error(error)

    if (job && shouldQueueImmediately) {
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
    } else if (job && !shouldQueueImmediately) {
        console.log(`Job ${job.id} scheduled for ${scheduledFor} - will be queued by cron`)
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

export async function updateJob(id: string, jobId: string, formData: FormData) {
    const supabase = await createClient()

    // Re-authenticate user
    const { data: { user } = {} } = await supabase.auth.getUser()
    if (!user) return

    // 1. Fetch current job to verify status and ownership
    const { data: currentJob } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', user.id)
        .single()

    if (!currentJob) {
        throw new Error("Job not found or access denied")
    }

    if (currentJob.status !== 'scheduled' && currentJob.status !== 'failed') {
        throw new Error("Only scheduled or failed jobs can be edited")
    }

    // 2. Extract and Validate Form Data
    const scheduledFor = formData.get('scheduledFor') as string
    const keyword = formData.get('keyword') as string
    const authorId = formData.get('author Id') as string
    const categoryId = formData.get('categoryId') as string
    const intent = formData.get('intent') as string
    // const includeImages = formData.get('includeImages') === 'on' 
    const preferredModel = formData.get('preferredModel') as string || null

    if (scheduledFor) {
        const scheduleDate = new Date(scheduledFor)
        if (scheduleDate < new Date()) {
            throw new Error("Scheduled time must be in the future")
        }
    }

    // Check if scheduled time actually changed
    const scheduleTimeChanged = scheduledFor && (
        !currentJob.scheduled_for ||
        new Date(scheduledFor).getTime() !== new Date(currentJob.scheduled_for).getTime()
    )

    const updates: any = {
        keyword,
        sanity_author_id: authorId || null,
        sanity_category_id: categoryId || null,
        intent: intent || 'informational',
        preferred_model: preferredModel,
        status: 'scheduled'
    }

    if (scheduledFor) {
        updates.scheduled_for = scheduledFor
        // Only reset queue status if schedule actually changed
        if (scheduleTimeChanged) {
            updates.inngest_queued = false
        }
    }

    // Determine if job should be queued immediately or wait for cron
    const shouldQueueImmediately = scheduledFor && (() => {
        const scheduleDate = new Date(scheduledFor);
        const sixDaysFromNow = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
        return scheduleDate <= sixDaysFromNow;
    })();

    // 3. Update Database (using service client to bypass RLS)
    const serviceClient = createServiceClient()
    const { error } = await serviceClient
        .from('jobs')
        .update(updates)
        .eq('id', jobId)
        .eq('user_id', user.id)

    if (error) {
        throw new Error(`Failed to update job: ${error.message}`)
    }

    // 4. Handle Inngest Rescheduling - ONLY if schedule time changed
    if (scheduleTimeChanged) {
        try {
            // Cancel the previous run
            await inngest.send({
                name: "job/cancelled",
                data: { jobId: jobId }
            })

            // Only queue immediately if within 6-day window
            if (shouldQueueImmediately) {
                await inngest.send({
                    name: "job/created",
                    data: {
                        jobId: jobId,
                        projectId: currentJob.project_id,
                        keyword: keyword,
                        scheduledFor: scheduledFor || null
                    }
                })

                // Mark as queued
                await serviceClient
                    .from('jobs')
                    .update({ inngest_queued: true })
                    .eq('id', jobId)
            } else {
                console.log(`Job ${jobId} rescheduled for ${scheduledFor} - will be queued by cron`)
            }
        } catch (inngestError: any) {
            console.error("Failed to reschedule job in Inngest:", inngestError)
        }
    } else {
        console.log(`Job ${jobId} metadata updated - schedule unchanged, no Inngest reschedule needed`)
    }

    revalidatePath(`/dashboard/websites/${id}`)
    redirect(`/dashboard/websites/${id}`)
}


export async function deleteJob(id: string, formData: FormData) {
    const supabase = await createClient()

    const jobId = formData.get('jobId') as string

    // Re-authenticate user
    const { data: { user } = {} } = await supabase.auth.getUser()
    if (!user) {
        console.error('No user found for delete operation')
        return
    }

    console.log(`Attempting to delete job ${jobId} for user ${user.id}`)

    // 1. Fetch current job to verify ownership
    const { data: currentJob, error: fetchError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', user.id)
        .single()

    if (fetchError) {
        console.error('Error fetching job:', fetchError)
        throw new Error(`Failed to fetch job: ${fetchError.message}`)
    }

    if (!currentJob) {
        console.error('Job not found or access denied')
        throw new Error("Job not found or access denied")
    }

    console.log(`Job found: ${currentJob.keyword}, status: ${currentJob.status}`)

    // 2. Cancel Inngest task if it exists
    try {
        await inngest.send({
            name: "job/cancelled",
            data: { jobId: jobId }
        })
        console.log(`Inngest task cancelled for job ${jobId}`)
    } catch (inngestError: any) {
        console.error("Failed to cancel job in Inngest:", inngestError)
        // Continue with deletion even if Inngest fails
    }

    // 3. Delete from database using service client (bypasses RLS)
    const serviceClient = createServiceClient()
    const { error: deleteError } = await serviceClient
        .from('jobs')
        .delete()
        .eq('id', jobId)
        .eq('user_id', user.id)

    if (deleteError) {
        console.error('Database deletion error:', deleteError)
        throw new Error(`Failed to delete job: ${deleteError.message}`)
    }

    console.log(`Job ${jobId} successfully deleted from database`)

    revalidatePath(`/dashboard/websites/${id}`)
    redirect(`/dashboard/websites/${id}`)
}

