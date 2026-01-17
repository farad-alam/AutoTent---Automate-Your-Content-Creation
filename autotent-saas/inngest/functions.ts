import { inngest } from "./client";
import { generateBlogContent } from "@/lib/gemini";
import { publishToSanity } from "@/lib/sanity";
import { createServiceClient } from "@/lib/supabase-server"; // Use service client for background jobs

export const generateContent = inngest.createFunction(
    { id: "generate-content", concurrency: 2 },
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
            const generatedContent = await step.run("generate-ai-content", async () => {
                return await generateBlogContent(job.keyword);
            });

            // 3. Publish to Sanity
            if (!project.sanity_project_id || !project.sanity_token) {
                throw new Error("Sanity configuration is missing. Please configure Sanity in Website Settings.");
            }

            const sanityResult = await step.run("publish-sanity", async () => {
                return await publishToSanity({
                    projectId: project.sanity_project_id,
                    dataset: project.sanity_dataset,
                    token: project.sanity_token
                }, {
                    ...generatedContent,
                    authorId: job.sanity_author_id,
                    categoryId: job.sanity_category_id
                });
            });

            // 4. Update Job Status
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
