import { inngest } from "./client";
import { generateBlogContent } from "@/lib/gemini";
import { publishToSanity } from "@/lib/sanity";
import { createClient } from "@/lib/supabase-server"; // Use server client

export const generateContent = inngest.createFunction(
    { id: "generate-content", concurrency: 2 },
    { event: "job/created" },
    async ({ event, step }) => {
        const { jobId, projectId } = event.data;
        const supabase = await createClient();

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
            const sanityResult = await step.run("publish-sanity", async () => {
                return await publishToSanity({
                    projectId: project.sanity_project_id,
                    dataset: project.sanity_dataset,
                    token: project.sanity_token
                }, generatedContent);
            });

            // 4. Update Job Status
            await step.run("complete-job", async () => {
                // Construct the URL (assuming standard Sanity studio or frontend URL structure, or just ID)
                const resultUrl = `https://${project.sanity_project_id}.sanity.studio/structure/document/${sanityResult._id}`;

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
