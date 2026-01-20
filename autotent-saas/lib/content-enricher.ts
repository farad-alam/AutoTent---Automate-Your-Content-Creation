import { generateBatchSearchTerms } from "./gemini";
import { searchImage } from "./unsplash";
import { searchYouTubeVideo } from "./youtube";

type EnrichmentOptions = {
    includeImages: boolean;
    includeVideos: boolean;
    keyword: string; // Context for AI
    apiKey: string;  // User's Gemini API key
};

export async function enrichContent(markdown: string, options: EnrichmentOptions): Promise<string> {
    const { includeImages, includeVideos, keyword, apiKey } = options;

    if (!includeImages && !includeVideos) return markdown;

    console.log("Starting content enrichment...");

    // Split content by H2 headers
    // 0: Intro (Text before first H2)
    // 1: First H2 Section
    // ...
    const sections = markdown.split(/\n(?=## )/);

    const headingsToEnrich: { list: string[], map: Map<string, { index: number, type: 'image' | 'video' }> } = {
        list: [], // List of strings for valid headings
        map: new Map() // Map heading -> metadata
    };

    // 1. Identify Valid Slots
    // Rules:
    // - Skip Index 0 (Intro)
    // - Skip Index 1 (First H2 - User requested no media at top)
    // - Skip "Conclusion" / "Summary"

    let validIndices: number[] = [];

    sections.forEach((section, index) => {
        if (index <= 1) return; // Skip Intro and Top Section

        const match = section.match(/^## (.*?)(\n|$)/);
        if (!match) return;

        const heading = match[1].trim();
        const headingLower = heading.toLowerCase();

        // Skip Conclusion types
        if (headingLower.includes('conclusion') ||
            headingLower.includes('summary') ||
            headingLower.includes('wrap up') ||
            headingLower.includes('final thoughts')) {
            return;
        }

        validIndices.push(index);
    });

    // 2. Assign Media to Slots
    // Rules:
    // - Max 1 Video (Lower side / Last slot)
    // - Max 2 Images (Middle / Earlier slots)

    const assignments = new Map<number, 'image' | 'video'>();
    let remainingSlots = [...validIndices];

    // Assign Video (Last available slot)
    if (includeVideos && remainingSlots.length > 0) {
        const lastSlot = remainingSlots.pop()!;
        assignments.set(lastSlot, 'video');
    }

    // Assign Images (First 2 available slots)
    if (includeImages) {
        let count = 0;
        while (count < 2 && remainingSlots.length > 0) {
            const slot = remainingSlots.shift()!;
            assignments.set(slot, 'image');
            count++;
        }
    }

    // 3. Build Batch Lists
    assignments.forEach((type, index) => {
        const section = sections[index];
        const match = section.match(/^## (.*?)(\n|$)/);
        if (match) {
            const heading = match[1].trim();
            headingsToEnrich.list.push(heading);
            headingsToEnrich.map.set(heading, { index, type });
        }
    });

    if (headingsToEnrich.list.length === 0) {
        console.log("No valid slots found for media injection.");
        return markdown;
    }

    // 4. Batch Generate Terms
    const imageHeadings = headingsToEnrich.list.filter(h => headingsToEnrich.map.get(h)?.type === 'image');
    console.log("Image Headings:", imageHeadings);

    const videoHeadings = headingsToEnrich.list.filter(h => headingsToEnrich.map.get(h)?.type === 'video');
    console.log("Video Headings:", videoHeadings);

    const [imageTerms, videoTerms] = await Promise.all([
        imageHeadings.length > 0 ? generateBatchSearchTerms(imageHeadings, keyword, apiKey, 'image') : Promise.resolve({} as Record<string, string>),
        videoHeadings.length > 0 ? generateBatchSearchTerms(videoHeadings, keyword, apiKey, 'video') : Promise.resolve({} as Record<string, string>)
    ]);

    // 5. Fetch Media (Parallel)
    const mediaResults = new Map<string, string>(); // heading -> markdown injection string

    const imagePromises = imageHeadings.map(async (heading) => {
        const term = imageTerms[heading] || heading;
        const url = await searchImage(term);
        if (url) {
            mediaResults.set(heading, `\n\n![${term}](${url})\n\n`);
        }
    });

    const videoPromises = videoHeadings.map(async (heading) => {
        const term = videoTerms[heading] || heading;
        const video = await searchYouTubeVideo(term);
        if (video) {
            // Video Card Markdown
            mediaResults.set(heading, `\n\n[![Watch: ${video.title}](${video.thumbnailUrl})](${video.videoUrl})\n*Watch: ${video.title}*\n\n`);
        }
    });

    await Promise.all([...imagePromises, ...videoPromises]);

    // 6. Reassemble
    const enrichedSections = sections.map((section, index) => {
        const match = section.match(/^## (.*?)(\n|$)/);
        if (!match) return section;

        const heading = match[1].trim();
        // Check if this heading has an assignment
        const injection = mediaResults.get(heading);

        if (injection) {
            // Insert after the header line
            return section.replace(match[0], `${match[0]}${injection}`);
        }
        return section;
    });

    return enrichedSections.join('');
}
