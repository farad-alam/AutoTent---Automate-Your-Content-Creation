import { inngest } from "./client";
import { generateBlogContent } from "@/lib/gemini";
import { publishToSanity } from "@/lib/sanity";
import { createServiceClient } from "@/lib/supabase-server"; // Use service client for background jobs

export const generateContent = inngest.createFunction(
    {
        id: "generate-content",
        concurrency: 2,
        retries: 0 // Don't retry - rate limits need manual intervention
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
            // 2. Generate Content via Gemini
            let generatedContent = await step.run("generate-ai-content", async () => {
                return await generateBlogContent(job.keyword);
            });

            // 2.5 Enrich Content (Images & Videos)
            if (job.include_images || job.include_videos) {
                generatedContent.bodyMarkdown = await step.run("enrich-content", async () => {
                    const { enrichContent } = await import('@/lib/content-enricher');
                    return await enrichContent(generatedContent.bodyMarkdown, {
                        includeImages: job.include_images,
                        includeVideos: job.include_videos,
                        keyword: job.keyword
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
                const { searchImage } = await import('@/lib/unsplash');
                const { uploadImageToSanity } = await import('@/lib/sanity');
                const { generateImageSearchTerm } = await import('@/lib/gemini');

                // Generate specific visual search term
                const searchTerm = await step.run("generate-image-term", async () => {
                    return await generateImageSearchTerm(job.keyword);
                });

                const imageUrl = await step.run("fetch-image", async () => {
                    return await searchImage(searchTerm);
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

            throw error;
        }

        return { success: true };
    }
);
