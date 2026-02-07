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
        retries: 2, // Retry up to 2 times for transient errors
        cancelOn: [
            { event: "job/cancelled", match: "data.jobId" }
        ]
    },
    { event: "job/created" },
    async ({ event, step }: any) => {
        const { jobId, projectId, scheduledFor } = event.data;
        const supabase = createServiceClient();

        if (scheduledFor) {
            await step.sleepUntil("wait-for-schedule", scheduledFor);
        }

        // CRITICAL: Check if job still exists and is valid after waking from sleep
        // This 'Defense-in-Depth' protects against jobs deleted or rescheduled while sleeping
        // because Inngest cancellation events can sometimes be missed in production distributed systems.
        const shouldRun = await step.run("verify-job-validity", async () => {
            const { data: job } = await supabase
                .from('jobs')
                .select('id, status, inngest_queued')
                .eq('id', jobId)
                .single();

            // 1. Job was deleted
            if (!job) {
                console.log(`🛑 Job ${jobId} deleted from DB - cancelling execution`);
                return false;
            }

            // 2. Job status changed (e.g. failed, cancelled, completed)
            if (job.status !== 'scheduled' && job.status !== 'pending') {
                console.log(`🛑 Job ${jobId} status is '${job.status}' (not scheduled) - cancelling`);
                return false;
            }

            // 3. Job was rescheduled to far future (inngest_queued set to false)
            // Or explicitly removed from queue
            if (job.inngest_queued === false) {
                console.log(`🛑 Job ${jobId} has inngest_queued=false - cancelling`);
                return false;
            }

            return true;
        });

        if (!shouldRun) {
            return { cancelled: true, reason: "Job invalid after sleep" };
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
            // 1.5 Research Topic (Tavily)
            const sources = await step.run("research-topic", async () => {
                const { getDomainWhitelist } = await import('@/lib/niche-detector');
                const { searchTavily } = await import('@/lib/tavily');

                // 🔍 AI Niche Detection: Get authority domains for this specific keyword
                const domains = await getDomainWhitelist(job.keyword);

                // 🔍 Search Tavily using ONLY those trusted domains
                let results = await searchTavily(job.keyword, domains);

                // FALLBACK: If strict search failed (0 results), try broad search
                // This ensures we always have SOME sources for citations
                if (results.length === 0) {
                    console.log(`⚠️ Strict search for "${job.keyword}" yielded 0 results. Falling back to broad search...`);
                    results = await searchTavily(job.keyword); // No domain restriction
                }

                if (results.length > 0) {
                    return "Here are some verified sources to use for citations (MANDATORY TO USE):\n" +
                        results.map(s => `- [${s.title}](${s.url})`).join('\n');
                }
                return "";
            });

            // 2. Generate Content via AI (using provider selected at job creation)
            let generatedContent = await step.run("generate-ai-content", async () => {
                // Read ai_provider from JOB (not project)
                // This ensures scheduled jobs use the provider selected at scheduling time
                const selectedProvider = job.ai_provider || 'auto'

                // Special handling for explicit provider choices (gemini or groq)
                const ensureMinExcerpt = (content: any) => {
                    if (!content.excerpt || content.excerpt.split(/\s+/).length < 20) {
                        // Fallback to first 25 words of body (slightly more than 20 to be safe)
                        const words = content.bodyMarkdown.replace(/[#*`]/g, '').split(/\s+/).slice(0, 25);
                        content.excerpt = words.join(' ') + '...';
                        console.log(`⚠️ Excerpt too short, regenerated from body: "${content.excerpt}"`);
                    }
                    return content;
                };

                if (selectedProvider === 'gemini') {
                    if (!project.gemini_api_key) {
                        throw new Error('Gemini API key required but not configured. Please add your Gemini API key in website settings.')
                    }
                    console.log('Using Gemini (user selected)')
                    // Pass sources and preferred model to Gemini generator
                    return await generateBlogContent(
                        job.keyword,
                        project.gemini_api_key,
                        job.intent,
                        sources,
                        job.preferred_model || undefined  // Read from job record
                    ).then(ensureMinExcerpt)
                }

                if (selectedProvider === 'groq') {
                    if (!project.groq_api_key && !process.env.GROQ_API_KEY) {
                        throw new Error('Groq API key required but not configured. Please add your Groq API key in website settings.')
                    }
                    console.log('Using Groq (user selected)')
                    const { generateGroqArticle: genGroq } = await import('@/lib/groq')
                    // Pass sources to Groq generator
                    const groqResult = await genGroq(job.keyword, project.groq_api_key, job.intent, sources)
                    return ensureMinExcerpt({
                        title: groqResult.title,
                        bodyMarkdown: groqResult.body,
                        excerpt: groqResult.excerpt,
                        metaDescription: groqResult.metaDescription,
                        focusKeyword: groqResult.focusKeyword,
                        slug: groqResult.slug,
                        modelUsed: groqResult.modelUsed,
                    });
                }

                // Auto mode: intelligent fallback logic
                // Try Gemini first if API key is available
                if (project.gemini_api_key) {
                    try {
                        return await generateBlogContent(
                            job.keyword,
                            project.gemini_api_key,
                            job.intent,
                            sources,
                            job.preferred_model || undefined  // Read from job record
                        ).then(ensureMinExcerpt);
                    } catch (geminiError: any) {
                        console.error("Gemini generation failed:", geminiError);

                        // If Gemini fails, try Groq as fallback
                        if (project.groq_api_key || process.env.GROQ_API_KEY) {
                            console.log("Attempting Groq fallback...");
                            const { generateGroqArticle } = await import('@/lib/groq');
                            const groqContent = await generateGroqArticle(job.keyword, project.groq_api_key, job.intent, sources);

                            return ensureMinExcerpt({
                                title: groqContent.title,
                                bodyMarkdown: groqContent.body,
                                excerpt: groqContent.excerpt,
                                metaDescription: groqContent.metaDescription,
                                focusKeyword: groqContent.focusKeyword,
                                slug: groqContent.slug,
                                modelUsed: groqContent.modelUsed
                            });
                        }

                        // No fallback available, rethrow
                        throw geminiError;
                    }
                }

                // If no Gemini key, try Groq directly
                if (project.groq_api_key || process.env.GROQ_API_KEY) {
                    console.log("Using Groq as primary AI provider...");
                    const { generateGroqArticle } = await import('@/lib/groq');
                    const groqContent = await generateGroqArticle(job.keyword, project.groq_api_key, job.intent, sources);

                    return ensureMinExcerpt({
                        title: groqContent.title,
                        bodyMarkdown: groqContent.body,
                        excerpt: groqContent.excerpt,
                        metaDescription: groqContent.metaDescription,
                        focusKeyword: groqContent.focusKeyword,
                        slug: groqContent.slug,
                        modelUsed: groqContent.modelUsed
                    });
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

            // 2.6 Add Internal Links
            if (job.include_internal_links) {
                generatedContent.bodyMarkdown = await step.run("add-internal-links", async () => {
                    const { findLinkableArticles, generateInternalLinks } = await import('@/lib/internal-linker');

                    console.log('Starting internal linking...');

                    // Find related articles
                    const linkableArticles = await findLinkableArticles(
                        projectId,
                        job.keyword,
                        generatedContent.excerpt || '',
                        10
                    );

                    console.log(`Found ${linkableArticles.length} linkable articles`);

                    if (linkableArticles.length === 0) {
                        console.log('No existing articles found to link to. Skipping internal linking.');
                        return generatedContent.bodyMarkdown;
                    }

                    // Inject links
                    return await generateInternalLinks(
                        generatedContent.bodyMarkdown,
                        linkableArticles,
                        job.keyword,
                        project.gemini_api_key,
                        job.internal_link_density as 'low' | 'medium' | 'high'
                    );
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
                    result_url: resultUrl,
                    model_used: generatedContent.modelUsed
                }).eq('id', jobId);
            });

            // 5.5 Store Article Metadata for Future Linking
            await step.run("store-article-metadata", async () => {
                const wordCount = generatedContent.bodyMarkdown.split(/\s+/).length;

                console.log('Storing article metadata for internal linking...');

                // Check for duplicate slug in same project
                const { data: existingMetadata } = await supabase
                    .from('articles_metadata')
                    .select('id')
                    .eq('project_id', projectId)
                    .eq('slug', generatedContent.slug)
                    .single();

                if (existingMetadata) {
                    console.log(`⚠️ Metadata for slug "${generatedContent.slug}" already exists. Skipping insertion to prevent duplicates.`);
                    return;
                }

                const { error } = await supabase.from('articles_metadata').insert({
                    project_id: projectId,
                    sanity_document_id: sanityResult._id,
                    title: generatedContent.title,
                    slug: generatedContent.slug,
                    excerpt: generatedContent.excerpt,
                    focus_keyword: generatedContent.focusKeyword,
                    word_count: wordCount,
                    published_at: new Date().toISOString()
                });

                if (error) {
                    console.error('Failed to store article metadata:', error);
                } else {
                    console.log('Article metadata stored successfully');
                }
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

// Cron job to queue upcoming scheduled jobs to Inngest
// Runs every 6 hours to queue jobs scheduled within the next 6 days
export const queueUpcomingJobs = inngest.createFunction(
    {
        id: "queue-upcoming-jobs",
        retries: 2
    },
    { cron: "0 */6 * * *" }, // Every 6 hours
    async ({ step }: any) => {
        const supabase = createServiceClient();

        // Calculate time window: now to 6 days from now
        const now = new Date();
        const sixDaysFromNow = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);

        const results = await step.run("queue-eligible-jobs", async () => {
            // Find jobs that need to be queued
            const { data: jobs, error } = await supabase
                .from('jobs')
                .select('*')
                .eq('status', 'scheduled')
                .eq('inngest_queued', false)
                .gte('scheduled_for', now.toISOString())
                .lte('scheduled_for', sixDaysFromNow.toISOString());

            if (error) {
                console.error("Error fetching jobs to queue:", error);
                throw error;
            }

            if (!jobs || jobs.length === 0) {
                console.log("No jobs to queue at this time");
                return { queued: 0, failed: 0 };
            }

            console.log(`Found ${jobs.length} jobs to queue`);

            let queued = 0;
            let failed = 0;

            // Queue each job to Inngest
            for (const job of jobs) {
                try {
                    // Send job/created event
                    await inngest.send({
                        name: "job/created",
                        data: {
                            jobId: job.id,
                            projectId: job.project_id,
                            keyword: job.keyword,
                            scheduledFor: job.scheduled_for
                        }
                    });

                    // Mark as queued in database
                    await supabase
                        .from('jobs')
                        .update({ inngest_queued: true })
                        .eq('id', job.id);

                    queued++;
                    console.log(`Queued job ${job.id} for ${job.scheduled_for}`);
                } catch (err: any) {
                    failed++;
                    console.error(`Failed to queue job ${job.id}:`, err.message);
                }
            }

            return { queued, failed, total: jobs.length };
        });

        console.log(`Queue run complete: ${results.queued} queued, ${results.failed} failed`);
        return results;
    }
);
