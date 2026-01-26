import { createClient } from 'pexels';

// --- Types ---

interface ImageResult {
    url: string;
    description: string;
    tags: string[];
}

// --- Verification Logic ---

/**
 * Verifies if the found image is actually relevant to the search query.
 * It checks if at least one meaningful word from the query exists in the image's tags or description.
 */
export function verifyImageRelevance(query: string, image: ImageResult): boolean {
    // 1. Clean up query: remove stop words, lowercase
    const stopWords = ['a', 'an', 'the', 'in', 'on', 'at', 'for', 'to', 'of', 'with', 'by', 'and', 'or', 'is', 'are', 'was', 'were'];
    const meaningfulWords = query.toLowerCase()
        .split(/[^a-z0-9]/) // Split by non-alphanumeric
        .filter(w => w.length > 2 && !stopWords.includes(w));

    if (meaningfulWords.length === 0) return true; // If query is just stop words (unlikely), let it pass (or fail? safest to pass)

    // 2. Prepare image metadata
    const description = (image.description || '').toLowerCase();
    const tags = image.tags.map(t => t.toLowerCase());

    // 3. Check for intersection
    // We want at least one MATCH (or maybe a higher threshold? For now, 1 strong match is good)
    // If the query is "Cat smelling bad", we want to match "cat" OR "smell" OR "bad".
    // "cat" is the strongest noun usually.

    const hasMatch = meaningfulWords.some(word => {
        // Check exact word in tags
        if (tags.includes(word)) return true;
        // Check partial match in description (e.g. "cat sleeping" contains "cat")
        if (description.includes(word)) return true;
        return false;
    });

    if (!hasMatch) {
        console.warn(`[Image Verification Failed] Query: "${query}". Found Image Tags: [${tags.slice(0, 5).join(', ')}...], Desc: "${description.substring(0, 50)}..."`);
    }

    return hasMatch;
}

// --- Pexels Search ---

export async function searchPexels(query: string, apiKey: string): Promise<string | null> {
    if (!apiKey) return null;

    try {
        console.log(`[Pexels] Searching for: "${query}"`);
        const client = createClient(apiKey);

        // Pexels client types might imply photos.search returns a specific structure
        // utilizing 'any' casting if types are not perfectly aligned in environment
        const response: any = await client.photos.search({ query, per_page: 5, orientation: 'landscape' });

        if (response && response.photos && response.photos.length > 0) {
            // Iterate through results to find the first VERIFIED match
            for (const photo of response.photos) {
                const isValid = verifyImageRelevance(query, {
                    url: photo.src.original,
                    description: photo.alt || '',
                    tags: [] // Pexels search result 'Photo' object often doesn't have detailed tags in the list view, rely on alt/description
                });

                if (isValid) {
                    // Pexels provides pre-sized URLs, but original is safest base. 
                    // We can use 'large2x' or 'landscape' for better performance if preferred using standard params.
                    // For consistency with Unsplash/Sanity logic, we return a high-res URL.
                    return photo.src.large2x || photo.src.original;
                }
            }
            console.log(`[Pexels] No images passed verification for "${query}".`);
        }
    } catch (error) {
        console.error("[Pexels] Search failed:", error);
    }
    return null;
}

// --- Pixabay Search ---

export async function searchPixabay(query: string, apiKey: string): Promise<string | null> {
    if (!apiKey) return null;

    try {
        console.log(`[Pixabay] Searching for: "${query}"`);
        const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=5`;

        const response = await fetch(url);
        if (!response.ok) return null;

        const data = await response.json();

        if (data.hits && data.hits.length > 0) {
            // Iterate through results to find the first VERIFIED match
            for (const hit of data.hits) {
                const isValid = verifyImageRelevance(query, {
                    url: hit.largeImageURL,
                    description: '', // Pixabay doesn't imply a description field often, relies on tags
                    tags: (hit.tags || '').split(',').map((t: string) => t.trim())
                });

                if (isValid) {
                    return hit.largeImageURL;
                }
            }
            console.log(`[Pixabay] No images passed verification for "${query}".`);
        }

    } catch (error) {
        console.error("[Pixabay] Search failed:", error);
    }
    return null;
}
