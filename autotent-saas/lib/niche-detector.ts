import { generateGroqContent } from './groq';

// In-memory cache to minimize AI calls and latency
// Key: keyword (lowercase), Value: niche name
const NICHE_CACHE = new Map<string, string>();

// Key: niche name (lowercase), Value: array of domains
const DOMAIN_CACHE = new Map<string, string[]>();

// Universal fallback domains (always safe)
const UNIVERSAL_AUTHORITIES = [
    "wikipedia.org",
    ".gov", // Will be treated as suffix match in Tavily if supported, or just specific high value ones
    "nih.gov", "cdc.gov", "nasa.gov", "ed.gov"
];

/**
 * Detects the specific sub-niche of a keyword using AI.
 * Example: "best dog food for puppies" -> "Canine Nutrition"
 */
export async function detectNiche(keyword: string): Promise<string> {
    const cacheKey = keyword.trim().toLowerCase();

    if (NICHE_CACHE.has(cacheKey)) {
        console.log(`[Niche] Cache hit for "${keyword}": "${NICHE_CACHE.get(cacheKey)}"`);
        return NICHE_CACHE.get(cacheKey)!;
    }

    const prompt = `You are an SEO taxonomy expert.
Analyze this keyword and identify its SPECIFIC sub-niche or industry.

Keyword: "${keyword}"

Rules:
1. Be GRANULAR. Don't say "Pets", say "Dog Training" or "Aquarium Maintenance".
2. Don't say "Finance", say "Cryptocurrency Trading" or "Retirement Planning".
3. Return ONLY the niche name. No citations. No pleasantries.

Niche:`;

    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error("GROQ_API_KEY missing");

        const niche = await generateGroqContent(prompt, apiKey);
        const cleanedNiche = niche.trim().replace(/["\.]/g, ''); // Remove quotes/periods

        NICHE_CACHE.set(cacheKey, cleanedNiche);
        return cleanedNiche;
    } catch (error) {
        console.warn("[Niche] Detection failed, defaulting to 'General':", error);
        return "General Knowledge";
    }
}

/**
 * Finds authoritative domains for a specific niche using AI.
 */
export async function findAuthorityDomains(niche: string): Promise<string[]> {
    const cacheKey = niche.trim().toLowerCase();

    if (DOMAIN_CACHE.has(cacheKey)) {
        return DOMAIN_CACHE.get(cacheKey)!;
    }

    const prompt = `You are a high-end SEO link builder.
List 8-12 highly authoritative, trusted websites specifically for the niche: "${niche}".

Criteria:
- Must be REAL, active, high-authority domains (DA 60+).
- Include a mix of:
  1. Broad authorities (e.g., WebMD for health, Investopedia for finance)
  2. Niche-specific experts (e.g., dPreview for cameras, AKC for dogs)
  3. Government/Edu sources if relevant (.gov, .edu)
- EXCLUDE: Forums (Reddit/Quora), social media, and generic content farms.
- Return ONLY the clean domain names (e.g., "example.com"), one per line. No bullets.

Domains:`;

    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error("GROQ_API_KEY missing");

        const response = await generateGroqContent(prompt, apiKey);

        // Parse and clean domains
        const domains = response
            .split('\n')
            .map(line => line.trim().toLowerCase())
            .map(line => line.replace(/^[-*•\d\.\s]+/, '')) // Remove bullets "1. ", "- "
            .map(line => line.replace(/https?:\/\//, '').replace(/\/$/, '')) // Remove http://
            .filter(line => line.includes('.') && !line.includes(' ')); // Basic validation

        const uniqueDomains = [...new Set(domains)].slice(0, 10); // Keep top 10 unique

        // Cache if valid
        if (uniqueDomains.length > 0) {
            DOMAIN_CACHE.set(cacheKey, uniqueDomains);
        }

        return uniqueDomains;
    } catch (error) {
        console.warn("[Niche] Authority lookup failed, using fallbacks:", error);
        return [];
    }
}

/**
 * Main entry point: Get whitelist for a keyword
 */
export async function getDomainWhitelist(keyword: string): Promise<string[]> {
    try {
        // 1. Detect Niche
        const niche = await detectNiche(keyword);
        console.log(`[Niche] Detected "${niche}" for keyword "${keyword}"`);

        // 2. Find Authorities
        const nicheDomains = await findAuthorityDomains(niche);
        console.log(`[Niche] Found ${nicheDomains.length} domains for "${niche}"`);

        // 3. Merge with Universal
        const whitelist = [...new Set([...UNIVERSAL_AUTHORITIES, ...nicheDomains])];

        return whitelist;
    } catch (e) {
        console.error("[Niche] Critical error in domain discovery:", e);
        return UNIVERSAL_AUTHORITIES; // Fail safe
    }
}
