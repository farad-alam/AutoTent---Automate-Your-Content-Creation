import { searchImage } from "./unsplash";
import { searchPexels, searchPixabay } from "./fallback-images";

type ImageFinderOptions = {
    checkUnsplash?: boolean;
    checkPexels?: boolean;
    checkPixabay?: boolean;
    verifyKeywords?: boolean;
    pexelsApiKey?: string;
    pixabayApiKey?: string;
};

/**
 * Finds the best image for a given query by trying multiple providers in order.
 * Order: Unsplash -> Pexels -> Pixabay
 */
export async function findBestImage(query: string, options: ImageFinderOptions = {}): Promise<string | null> {
    const {
        checkUnsplash = true,
        checkPexels = true,
        checkPixabay = true,
        verifyKeywords = true,
        pexelsApiKey,
        pixabayApiKey
    } = options;

    let url: string | null = null;

    // 1. Unsplash
    if (checkUnsplash) {
        try {
            console.log(`[Image Search] Trying Unsplash for: "${query}"`);
            url = await searchImage(query, { verifyKeywords });
            if (url) return url;
        } catch (e) {
            console.warn("Unsplash search error:", e);
        }
    }

    // 2. Pexels Fallback
    if (checkPexels && !url && pexelsApiKey) {
        console.log(`[Image Search] Unsplash failed/verified-fail. Trying Pexels for: "${query}"`);
        try {
            url = await searchPexels(query, pexelsApiKey);
            if (url) return url;
        } catch (e) {
            console.warn("Pexels search error:", e);
        }
    }

    // 3. Pixabay Fallback
    if (checkPixabay && !url && pixabayApiKey) {
        console.log(`[Image Search] Pexels failed. Trying Pixabay for: "${query}"`);
        try {
            url = await searchPixabay(query, pixabayApiKey);
            if (url) return url;
        } catch (e) {
            console.warn("Pixabay search error:", e);
        }
    }

    if (!url) {
        console.log(`[Image Search] Failed all sources for: "${query}"`);
    }

    return null;
}
