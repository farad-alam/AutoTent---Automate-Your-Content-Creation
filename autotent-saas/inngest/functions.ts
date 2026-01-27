import { inngest } from "./client";
import { generateBlogContent } from "@/lib/gemini";
import { publishToSanity } from "@/lib/sanity";
import { createServiceClient } from "@/lib/supabase-server"; // Use service client for background jobs

// Custom error class for non-retriable errors
class NonRetriableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NonRetriableError';
    }
}

export const generateContent = inngest.createFunction(
    {
        id: "generate-content",
        concurrency: 1, // Reduced to 1 to respect Groq Free Tier TPM limits (esp. with DeepSeek 70B)
        retries: 2 // Retry up to 2 times for transient errors
    },
    { event: "job/created" },
    async ({ event, step }: any) => {
        const { jobId, projectId, scheduledFor } = event.data;
        const supabase = createServiceClient();

        if (scheduledFor) {
            await step.sleepUntil("wait-for-schedule", scheduledFor);
        }

        // 1. Fetch Job & Project Details
        const projectData = await step.run("fetch-project-data", async () => {
            const { data: job } = await supabase.from('jobs').select('*').eq('id', jobId).single();
            const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();

            if (!job || !project) throw new Error("Job or Project not found");

            // Update status to processing
            await supabase.from('jobs').update({ status: 'processing' }).eq('id', jobId);

            return { job, project };
        });

        const { job, project } = projectData;

        try {
            // 2. Generate Content via AI (using provider selected at job creation)
            let generatedContent = await step.run("generate-ai-content", async () => {
                // Read ai_provider from JOB (not project)
                // This ensures scheduled jobs use the provider selected at scheduling time
                const selectedProvider = job.ai_provider || 'auto'

                // Special handling for explicit provider choices (gemini or groq)
                if (selectedProvider === 'gemini') {
                    if (!project.gemini_api_key) {
                        throw new Error('Gemini API key required but not configured. Please add your Gemini API key in website settings.')
                    }
                    console.log('Using Gemini (user selected)')
                    return await generateBlogContent(job.keyword, project.gemini_api_key, job.intent)
                }

                if (selectedProvider === 'groq') {
                    if (!project.groq_api_key && !process.env.GROQ_API_KEY) {
                        throw new Error('Groq API key required but not configured. Please add your Groq API key in website settings.')
                    }
                    console.log('Using Groq (user selected)')
                    const { generateGroqArticle: genGroq } = await import('@/lib/groq')
                    const groqResult = await genGroq(job.keyword, project.groq_api_key, job.intent)
                    return {
                        title: groqResult.title,
                        bodyMarkdown: groqResult.body,
                        excerpt: groqResult.excerpt,
                        metaDescription: groqResult.metaDescription,
                        focusKeyword: groqResult.focusKeyword,
                        slug: groqResult.slug,
                    }
                }

                // Auto mode: intelligent fallback logic
                // Try Gemini first if API key is available
                if (project.gemini_api_key) {
                    try {
                        return await generateBlogContent(job.keyword, project.gemini_api_key, job.intent);
                    } catch (geminiError: any) {
                        console.error("Gemini generation failed:", geminiError);

                        // If Gemini fails, try Groq as fallback
                        if (project.groq_api_key || process.env.GROQ_API_KEY) {
                            console.log("Attempting Groq fallback...");
                            const { generateGroqArticle } = await import('@/lib/groq');
                            const groqContent = await generateGroqArticle(job.keyword, project.groq_api_key, job.intent);

                            return {
                                title: groqContent.title,
                                bodyMarkdown: groqContent.body,
                                excerpt: groqContent.excerpt,
                                metaDescription: groqContent.metaDescription,
                                focusKeyword: groqContent.focusKeyword,
                                slug: groqContent.slug,
                            };
                        }

                        // No fallback available, rethrow
                        throw geminiError;
                    }
                }

                // If no Gemini key, try Groq directly
                if (project.groq_api_key || process.env.GROQ_API_KEY) {
                    console.log("Using Groq as primary AI provider...");
                    const { generateGroqArticle } = await import('@/lib/groq');
                    const groqContent = await generateGroqArticle(job.keyword, project.groq_api_key, job.intent);

                    return {
                        title: groqContent.title,
                        bodyMarkdown: groqContent.body,
                        excerpt: groqContent.excerpt,
                        metaDescription: groqContent.metaDescription,
                        focusKeyword: groqContent.focusKeyword,
                        slug: groqContent.slug,
                    };
                }

                // No API keys available
                throw new Error('No AI API keys configured. Please add either a Gemini or Groq API key in website settings.');
            });

            // 2.5 Enrich Content (Images & Videos)
            if (job.include_images || job.include_videos) {
                generatedContent.bodyMarkdown = await step.run("enrich-content", async () => {
                    const { enrichContent } = await import('@/lib/content-enricher');
                    return await enrichContent(generatedContent.bodyMarkdown, {
                        includeImages: job.include_images,
                        includeVideos: job.include_videos,
                        keyword: job.keyword,
                        apiKey: project.gemini_api_key,
                        includeGoogleLinks: job.use_google_search_links,
                        braveSearchApiKey: process.env.BRAVE_SEARCH_API_KEY,
                        pexelsApiKey: process.env.PEXELS_API_KEY,
                        pixabayApiKey: process.env.PIXABAY_API_KEY
                    });
                });
            }

            // 3. Publish to Sanity
            if (!project.sanity_project_id || !project.sanity_token) {
                throw new Error("Sanity configuration is missing. Please configure Sanity in Website Settings.");
            }

            // 3. (Optional) Fetch and Upload Image
            let mainImageId: string | undefined;
            try {
                const { findBestImage } = await import('@/lib/image-finder');
                const { uploadImageToSanity } = await import('@/lib/sanity');
                const { generateImageSearchTerm } = await import('@/lib/gemini');

                // Generate specific visual search term
                const searchTerm = await step.run("generate-image-search-term", async () => {
                    return await generateImageSearchTerm(job.keyword, project.gemini_api_key);
                });

                const imageUrl = await step.run("fetch-image", async () => {
                    return await findBestImage(searchTerm, {
                        checkUnsplash: true,
                        checkPexels: !!process.env.PEXELS_API_KEY,
                        checkPixabay: !!process.env.PIXABAY_API_KEY,
                        pexelsApiKey: process.env.PEXELS_API_KEY,
                        pixabayApiKey: process.env.PIXABAY_API_KEY
                    });
                });

                if (imageUrl) {
                    mainImageId = await step.run("upload-image", async () => {
                        return await uploadImageToSanity({
                            projectId: project.sanity_project_id,
                            dataset: project.sanity_dataset,
                            token: project.sanity_token
                        }, imageUrl);
                    });
                }
            } catch (imgError) {
                console.error("Image processing failed:", imgError);
                // Continue without image
            }

            // 4. Publish to Sanity
            const sanityResult = await step.run("publish-sanity", async () => {
                return await publishToSanity({
                    projectId: project.sanity_project_id,
                    dataset: project.sanity_dataset,
                    token: project.sanity_token
                }, {
                    ...generatedContent,
                    authorId: job.sanity_author_id,
                    categoryId: job.sanity_category_id,
                    mainImageId: mainImageId
                });
            });

            // 5. Update Job Status
            await step.run("complete-job", async () => {
                // Use the Sanity Manage URL
                const resultUrl = `https://www.sanity.io/manage/personal/project/${project.sanity_project_id}/desk/${sanityResult._type};${sanityResult._id}`;

                await supabase.from('jobs').update({
                    status: 'completed',
                    result_title: generatedContent.title,
                    result_url: resultUrl
                }).eq('id', jobId);
            });



        } catch (error: any) {
            await step.run("fail-job", async () => {
                await supabase.from('jobs').update({
                    status: 'failed',
                    error_message: error.message
                }).eq('id', jobId);
            });

            // For rate limit errors, don't retry
            if (error.message.includes('Rate limit') || error.message.includes('429')) {
                throw new NonRetriableError(error.message);
            }

            throw error;
        }

        return { success: true };
    }
);
