'use server'

import { createClient } from '@/lib/supabase-server';
import { syncSanityMetadata } from '@/lib/sync-sanity-metadata';

export async function syncExistingPosts(projectId: string): Promise<{ success: boolean; count: number; error?: string }> {
    const supabase = await createClient();

    // Get project details
    const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

    if (!project) {
        return { success: false, count: 0, error: 'Project not found' };
    }

    if (!project.sanity_project_id || !project.sanity_dataset || !project.sanity_token) {
        return { success: false, count: 0, error: 'Sanity configuration incomplete' };
    }

    // Run the sync
    const result = await syncSanityMetadata(
        projectId,
        project.sanity_project_id,
        project.sanity_dataset,
        project.sanity_token
    );

    return result;
}
