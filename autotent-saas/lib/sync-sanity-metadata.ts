import { createClient } from '@sanity/client';
import { createServiceClient } from '@/lib/supabase-server';

/**
 * Syncs existing Sanity posts to the articles_metadata table
 * This is a one-time backfill operation for existing content
 */
export async function syncSanityMetadata(
    projectId: string,
    sanityProjectId: string,
    sanityDataset: string,
    sanityToken: string
): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        console.log(`[Sync] Starting metadata sync for project ${projectId}`);

        // 1. Initialize Sanity client
        const sanityClient = createClient({
            projectId: sanityProjectId,
            dataset: sanityDataset,
            token: sanityToken,
            useCdn: false,
            apiVersion: '2024-01-01'
        });

        // 2. Fetch all posts from Sanity
        // GROQ query to get all published posts with the fields we need
        const query = `*[_type == "post"] {
            _id,
            title,
            slug,
            excerpt,
            "focusKeyword": slug.current,
            "wordCount": length(pt::text(body)),
            publishedAt,
            _createdAt
        }`;

        console.log('[Sync] Fetching posts from Sanity...');
        const posts = await sanityClient.fetch(query);

        if (!posts || posts.length === 0) {
            console.log('[Sync] No posts found in Sanity');
            return { success: true, count: 0 };
        }

        console.log(`[Sync] Found ${posts.length} posts in Sanity`);

        // 3. Prepare data for Supabase
        const supabase = createServiceClient();

        // Check which posts already exist in our metadata table
        const { data: existingMetadata } = await supabase
            .from('articles_metadata')
            .select('sanity_document_id')
            .eq('project_id', projectId);

        const existingIds = new Set(existingMetadata?.map(m => m.sanity_document_id) || []);

        // 4. Filter out posts that already exist
        const newPosts = posts.filter((post: any) => !existingIds.has(post._id));

        if (newPosts.length === 0) {
            console.log('[Sync] All posts already synced');
            return { success: true, count: 0 };
        }

        console.log(`[Sync] Syncing ${newPosts.length} new posts...`);

        // 5. Insert metadata into Supabase
        const metadataRecords = newPosts.map((post: any) => ({
            project_id: projectId,
            sanity_document_id: post._id,
            title: post.title || 'Untitled',
            slug: post.slug?.current || post._id,
            excerpt: post.excerpt || '',
            focus_keyword: post.focusKeyword || post.slug?.current || '',
            word_count: post.wordCount || 0,
            published_at: post.publishedAt || post._createdAt || new Date().toISOString()
        }));

        const { error } = await supabase
            .from('articles_metadata')
            .insert(metadataRecords);

        if (error) {
            console.error('[Sync] Failed to insert metadata:', error);
            return { success: false, count: 0, error: error.message };
        }

        console.log(`[Sync] Successfully synced ${newPosts.length} posts`);
        return { success: true, count: newPosts.length };

    } catch (error: any) {
        console.error('[Sync] Error during metadata sync:', error);
        return { success: false, count: 0, error: error.message };
    }
}
