export interface ContentSource {
    title: string;
    url: string;
    content: string;
    score: number;
}

/**
 * Search Tavily for high-quality external sources
 * @param query The search query (topic)
 * @returns Array of verified sources
 */
export async function searchTavily(query: string, includeDomains?: string[]): Promise<ContentSource[]> {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
        console.warn("Tavily API key is missing. Skipping external source search.");
        return [];
    }

    try {
        console.log(`[Tavily] Searching for: "${query}"...`);

        // Use provided domains or fallback to a standard safe list
        // Note: Ideally, specific domains should be passed from the caller (niche detector)
        const domainsToSearch = includeDomains && includeDomains.length > 0
            ? includeDomains
            : [
                "wikipedia.org",
                "nih.gov",
                "mayoclinic.org",
                "clevelandclinic.org",
                "healthline.com",
                "nytimes.com",
                "washingtonpost.com",
                "forbes.com",
                "wsj.com",
                "bbc.com",
                "cnn.com",
                "npr.org",
                "britannica.com",
                "investopedia.com",
                "techcrunch.com",
                "wired.com",
                "theverge.com"
            ];

        console.log(`[Tavily] Using ${domainsToSearch.length} allowed domains.`);

        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                api_key: apiKey,
                query: query,
                search_depth: "basic",
                include_answer: false,
                include_images: false,
                max_results: 5,
                include_domains: domainsToSearch
            })
        });

        if (!response.ok) {
            throw new Error(`Tavily API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.results || !Array.isArray(data.results)) {
            console.warn("[Tavily] Invalid response format:", data);
            return [];
        }

        const sources = data.results.map((result: any) => ({
            title: result.title,
            url: result.url,
            content: result.content,
            score: result.score
        }));

        console.log(`[Tavily] Found ${sources.length} sources.`);
        return sources;

    } catch (error: any) {
        console.error("[Tavily] Search failed:", error.message);
        return [];
    }
}
