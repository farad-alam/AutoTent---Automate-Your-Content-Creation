'use server'

import { createClient } from '@/lib/supabase-server'
import { createSanityClient } from '@/lib/sanity'
import { revalidatePath } from 'next/cache'

export async function syncSanityMetadata(projectId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    // 1. Fetch Project Config
    const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single()

    if (!project || !project.sanity_project_id || !project.sanity_dataset) {
        throw new Error("Sanity not configured for this project")
    }

    // 2. Fetch from Sanity
    const sanityClient = createSanityClient({
        projectId: project.sanity_project_id,
        dataset: project.sanity_dataset,
        token: project.sanity_token || '' // Token might be needed for private datasets, usually public reading is fine if dataset is public, but for metadata better use token if available
    })

    try {
        const query = `{
            "authors": *[_type == "author"] { _id, name },
            "categories": *[_type == "category"] { _id, title }
        }`

        const { authors, categories } = await sanityClient.fetch(query)

        // 3. Sync Authors
        if (authors && authors.length > 0) {
            const authorData = authors.map((a: any) => ({
                project_id: projectId,
                sanity_id: a._id,
                name: a.name || 'Unknown Author'
            }))

            // Upsert (requires unique constraint on project_id, sanity_id)
            const { error: authorError } = await supabase
                .from('sanity_authors')
                .upsert(authorData, { onConflict: 'project_id,sanity_id' })

            if (authorError) console.error("Error syncing authors:", authorError)
        }

        // 4. Sync Categories
        if (categories && categories.length > 0) {
            const categoryData = categories.map((c: any) => ({
                project_id: projectId,
                sanity_id: c._id,
                title: c.title || 'Untitled Category'
            }))

            const { error: catError } = await supabase
                .from('sanity_categories')
                .upsert(categoryData, { onConflict: 'project_id,sanity_id' })

            if (catError) console.error("Error syncing categories:", catError)
        }

        revalidatePath(`/dashboard/websites/${projectId}`)
        return { success: true, counts: { authors: authors?.length || 0, categories: categories?.length || 0 } }

    } catch (error: any) {
        console.error("Sanity sync error:", error)
        throw new Error(`Failed to sync: ${error.message}`)
    }
}
