'use server'

import { createClient } from '@/lib/supabase-server'
import { inngest } from '@/inngest/client'
import { redirect } from 'next/navigation'

export interface BulkJobData {
    keyword: string
    scheduledFor: string | null
    authorId: string | null
    categoryId: string | null
    preferredModel: string | null
    intent: string
    aiProvider: string
    includeImages: boolean
    includeVideos: boolean
    useGoogleSearchLinks: boolean
    includeInternalLinks: boolean
    internalLinkDensity: string
}

export async function createBulkJobs(websiteId: string, jobs: BulkJobData[]) {
    const supabase = await createClient()

    // Re-authenticate user inside action
    const { data: { user } = {} } = await supabase.auth.getUser()
    if (!user) {
        throw new Error('User not authenticated')
    }

    // Validate that we have jobs
    if (!jobs || jobs.length === 0) {
        throw new Error('No jobs provided')
    }

    // Prepare bulk insert data
    const jobInserts = jobs.map(job => ({
        user_id: user.id,
        project_id: websiteId,
        keyword: job.keyword,
        status: job.scheduledFor ? 'scheduled' : 'pending',
        intent: job.intent,
        ai_provider: job.aiProvider,
        scheduled_for: job.scheduledFor || null,
        sanity_author_id: job.authorId || null,
        sanity_category_id: job.categoryId || null,
        include_images: job.includeImages,
        include_videos: job.includeVideos,
        use_google_search_links: job.useGoogleSearchLinks,
        include_internal_links: job.includeInternalLinks,
        internal_link_density: job.internalLinkDensity,
        preferred_model: job.preferredModel
    }))

    // Batch insert into database
    const { data: createdJobs, error } = await supabase
        .from('jobs')
        .insert(jobInserts)
        .select()

    if (error) {
        console.error('Bulk insert error:', error)
        throw new Error(`Failed to create jobs: ${error.message}`)
    }

    // Trigger Inngest events for each job
    const inngestEvents = createdJobs.map(job => ({
        name: "job/created" as const,
        data: {
            jobId: job.id,
            projectId: websiteId,
            keyword: job.keyword,
            scheduledFor: job.scheduled_for || null
        }
    }))

    try {
        await inngest.send(inngestEvents)
    } catch (inngestError: any) {
        console.error('Inngest bulk trigger failed:', inngestError.message)

        // Mark all jobs as failed if Inngest fails
        const jobIds = createdJobs.map(j => j.id)
        await supabase
            .from('jobs')
            .update({
                status: 'failed',
                error_message: 'Failed to trigger background worker.'
            })
            .in('id', jobIds)

        throw new Error('Failed to schedule jobs for processing')
    }

    return { success: true, count: createdJobs.length }
}
