export async function searchImage(query: string): Promise<string | null> {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
        console.warn("Missing UNSPLASH_ACCESS_KEY");
        return null;
    }

    try {
        const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`, {
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
            const rawUrl = data.results[0].urls.raw;
            // Append compression parameters for Sanity/Web use
            // w=1200: Reasonable width for blog post header
            // h=630: 1.91:1 aspect ratio (good for social cards)
            // fit=crop: Crop to fit exact dimensions
            // q=75: 75% quality (good balance for storage savings)
            // fm=webp: WebP format for smaller file size (essential for Sanity storage)
            return `${rawUrl}?w=1200&h=630&fit=crop&q=75&fm=webp`;
        }

        return null;
    } catch (error) {
        console.error("Failed to search Unsplash:", error);
        return null;
    }
}
