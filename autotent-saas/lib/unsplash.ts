import { verifyImageRelevance } from './fallback-images';

export async function searchImage(query: string, options?: { verifyKeywords?: boolean }): Promise<string | null> {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
        console.warn("Missing UNSPLASH_ACCESS_KEY");
        return null;
    }

    try {
        const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`, {
            headers: {
                Authorization: `Client-ID ${accessKey}`
            }
        });

        if (!response.ok) {
            console.error(`Unsplash API error: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        if (data.results && data.results.length > 0) {
            // If verification is requested, loop through results to find a matching one
            if (options?.verifyKeywords) {
                for (const photo of data.results) {
                    const isValid = verifyImageRelevance(query, {
                        url: photo.urls.raw,
                        description: photo.description || photo.alt_description || '',
                        tags: (photo.tags || []).map((t: any) => t.title)
                    });

                    if (isValid) {
                        return formatUnsplashUrl(photo.urls.raw);
                    }
                }
                console.log(`[Unsplash] No images passed verification for "${query}".`);
                return null; // Fallback will take over
            }

            // Default behavior: return first result
            return formatUnsplashUrl(data.results[0].urls.raw);
        }

        return null;
    } catch (error) {
        console.error("Failed to search Unsplash:", error);
        return null;
    }
}

function formatUnsplashUrl(rawUrl: string): string {
    return `${rawUrl}?w=1200&h=630&fit=crop&q=75&fm=webp`;
}
