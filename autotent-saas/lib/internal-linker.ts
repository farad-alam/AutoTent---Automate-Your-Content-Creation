import { createServiceClient } from "@/lib/supabase-server";

/* -------------------------------------------------------------------------
   Types
   ------------------------------------------------------------------------- */

export type LinkDensity = 'low' | 'medium' | 'high';

interface LinkableArticle {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    focus_keyword: string;
    relevanceScore?: number;
}

interface InternalLinkPlan {
    targetArticleId: string;
    targetArticleTitle: string;
    targetArticleSlug: string;
    suggestedAnchorText: string;
    insertionContext: string; // The sentence or phrase where the link applies
}

/* -------------------------------------------------------------------------
   Configuration
   ------------------------------------------------------------------------- */

const DENSITY_CONFIG = {
    low: { min: 2, max: 3 },
    medium: { min: 3, max: 5 },
    high: { min: 5, max: 7 }
};

/* -------------------------------------------------------------------------
   Core Functions
   ------------------------------------------------------------------------- */

/**
 * Finds relevant articles from the same project to link to.
 * Prioritizes relevance (keyword overlap) and recency.
 */
export async function findLinkableArticles(
    projectId: string,
    currentKeyword: string,
    currentExcerpt: string,
    limit: number = 10
): Promise<LinkableArticle[]> {
    const supabase = createServiceClient();

    // 1. Fetch candidates from the same project
    // In a real vector-search scenario, we'd use embeddings. 
    // For now, we'll fetch recent articles and filter/rank in-memory or via simple text matching.
    const { data: articles, error } = await supabase
        .from('articles_metadata')
        .select('*')
        .eq('project_id', projectId)
        .order('published_at', { ascending: false })
        .limit(50); // Fetch a batch to rank

    if (error || !articles) {
        console.error("Error fetching linkable articles:", error);
        return [];
    }

    // 2. Simple Relevance Scoring
    // We want to avoid linking to the article we're currently writing (though it likely doesn't exist in DB yet)
    // We also want to find articles that share words with the current keyword

    const currentTokens = currentKeyword.toLowerCase().split(/\s+/);

    const scoredArticles = articles.map(article => {
        let score = 0;
        const targetTokens = (article.focus_keyword || '').toLowerCase().split(/\s+/);
        const titleTokens = article.title.toLowerCase().split(/\s+/);

        // Keyword overlap
        const keywordOverlap = currentTokens.filter(t => targetTokens.includes(t)).length;
        score += keywordOverlap * 2;

        // Title overlap
        const titleOverlap = currentTokens.filter(t => titleTokens.includes(t)).length;
        score += titleOverlap * 1;

        return { ...article, relevanceScore: score };
    });

    // 3. Sort by score desc, then published_at desc
    scoredArticles.sort((a, b) => (b.relevanceScore - a.relevanceScore));

    // Return top N
    return scoredArticles.slice(0, limit);
}

/**
 * Generates and injects internal links into the markdown content.
 */
export async function generateInternalLinks(
    markdown: string,
    linkableArticles: LinkableArticle[],
    currentKeyword: string,
    apiKey: string,
    density: LinkDensity = 'medium'
): Promise<string> {
    if (!linkableArticles.length) return markdown;

    console.log(`Starting internal linking. Candidates: ${linkableArticles.length}, Density: ${density}`);

    const { min, max } = DENSITY_CONFIG[density];
    const targetLinkCount = Math.floor(Math.random() * (max - min + 1)) + min;

    // 1. Analyze Content for Placement Opportunities
    // We'll ask AI to find the best spots to insert links to the candidate articles

    const candidatesDescription = linkableArticles.map((a, i) =>
        `${i + 1}. Title: "${a.title}", Keyword: "${a.focus_keyword}", Slug: "${a.slug}"`
    ).join('\n');

    // We process the content in chunks or pass the whole thing if it fits context.
    // For cost/speed, let's pass the text but truncate if absolutely massive.
    // Usually articles are < 3000 words, fitting in modern context windows easily.

    const prompt = `
You are an expert SEO editor. I will provide you with an article draft and a list of related articles ("Candidates") from the same website.
Your task is to identify the best opportunities to insert internal links to these candidates.

RULES:
1. Select up to ${targetLinkCount} insertion points.
2. Prioritize placing links in the FIRST 40% of the article.
3. Links must be contextually relevant.
4. **CRITICAL**: Do NOT place links in headings or the main title.
   - ONLY select text from PARAGRAPHS (regular body text)
   - NEVER select text that starts with # (markdown headings)
   - NEVER select text from H1, H2, H3, H4, H5, H6 elements
   - If a phrase appears in both a heading and body text, use the BODY TEXT version
5. Do NOT place links in the "Conclusion" section.
6. Create natural anchor text. AVOID "read this", "click here", or exact-match keyword stuffing. Use descriptive phrases.
   Example: Instead of "Click here for [Dog Training]", use "our guide on [effective dog training techniques]".

HEADING DETECTION EXAMPLES (DO NOT USE THESE):
❌ "## Common Culprits Behind Extremely Bad Smelling Cat Poop"  
❌ "### When to Worry: Recognizing Red Flags"  
❌ "# Why Does Cat Poop Smell Extremely Bad?"  
❌ Any line starting with one or more # symbols

CORRECT BODY TEXT EXAMPLES (USE THESE):
✓ "many cat owners notice that their cat's poop smells worse than usual"  
✓ "understanding the causes can help you take action"  
✓ "dietary changes are often the first step"

CRITICAL LINK FORMAT RULES:
- Use ONLY simple markdown format: [anchor text](/slug)
- Do NOT add rel="nofollow" or rel="noopener"
- Do NOT add target="_blank"
- Do NOT add any HTML attributes
- Do NOT use <a> tags
- Links MUST be relative paths starting with /

CANDIDATES:
${candidatesDescription}

ARTICLE CONTENT:
${markdown}

OUTPUT FORMAT (CRITICAL - FOLLOW EXACTLY):
Return a JSON array where each object has these THREE fields:

1. "targetArticleSlug": the slug from the candidates list above
2. "originalSnippet": COPY EXACT TEXT from the article (5-15 words) - DO NOT INVENT OR PARAPHRASE
3. "rewrittenSnippet": the SAME EXACT TEXT with a markdown link inserted

CRITICAL RULES FOR originalSnippet:
- MUST be copied WORD-FOR-WORD from the article above
- DO NOT create new text or paraphrase
- DO NOT invent phrases that sound related
- COPY AND PASTE exact text you see in the article
- If you cannot find exact matching text, skip that candidate

CORRECT EXAMPLES:
If article contains: "Many pet owners struggle with dirty toys"
✓ "originalSnippet": "pet owners struggle with dirty toys"
✓ "rewrittenSnippet": "[pet owners struggle with dirty toys](/pet-hygiene) daily"

INCORRECT EXAMPLES:
If article contains: "Many pet owners struggle with dirty toys"
✗ "originalSnippet": "pet hygiene problems" (NOT in article - INVENTED)
✗ "originalSnippet": "owners dealing with cleanliness" (PARAPHRASED - not exact)

Example Output:
[
  {
    "targetArticleSlug": "dog-dental-care",
    "originalSnippet": "dental issues can cause bad breath",
    "rewrittenSnippet": "understanding [dental issues can cause bad breath](/dog-dental-care) is crucial"
  }
]

OUTPUT JSON ONLY:
`;

    // Note: This is a simplified "replace" approach. 
    // A more robust way is to ask for "original sentence" and "rewritten sentence with link".
    // Let's optimize the prompt for the "Replacement" approach to be safer.

    const schema = `
    {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "targetArticleSlug": { "type": "string" },
                "originalSnippet": { "type": "string", "description": "A unique 5-10 word string from the text where the link should go" },
                "rewrittenSnippet": { "type": "string", "description": "The same snippet but with the markdown link applied. e.g. 'can use [advanced techniques](/slug) to improve'" }
            },
            "required": ["targetArticleSlug", "originalSnippet", "rewrittenSnippet"]
        }
    }
    `;

    try {
        let linkPlan: Array<{ targetArticleSlug: string, originalSnippet: string, rewrittenSnippet: string }> | null = null;

        // Try Gemini models in order: standard only (Lite is too imprecise for exact string matching)
        const geminiModels = ["gemini-2.5-flash"];
        let geminiSuccess = false;

        for (const modelName of geminiModels) {
            try {
                const { GoogleGenerativeAI } = require("@google/generative-ai");
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: { responseMimeType: "application/json" }
                });

                const result = await model.generateContent(prompt);
                const responseText = result.response.text();
                linkPlan = JSON.parse(responseText);
                console.log(`✓ Internal linking completed with Gemini (${modelName})`);
                console.log('Link plan received:', JSON.stringify(linkPlan, null, 2));
                geminiSuccess = true;
                break; // Success, exit loop
            } catch (modelError: any) {
                console.warn(`Gemini model ${modelName} failed:`, modelError.message);
                // Continue to next model
            }
        }

        // If all Gemini models failed, fall back to Groq
        if (!geminiSuccess) {
            console.log('All Gemini models failed, trying Groq fallback...');

            const Groq = require("groq-sdk").default;
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

            const groqResponse = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are an expert SEO editor. Respond only with valid JSON." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            });

            const groqText = groqResponse.choices[0]?.message?.content || "[]";
            linkPlan = JSON.parse(groqText);
            console.log('✓ Internal linking completed with Groq (fallback)');
            console.log('Link plan received:', JSON.stringify(linkPlan, null, 2));
        }

        if (!linkPlan || !Array.isArray(linkPlan)) {
            console.warn('Invalid link plan received (not an array), skipping internal linking');
            console.log('Received type:', typeof linkPlan, 'Value:', linkPlan);
            return markdown;
        }

        console.log(`Applying ${linkPlan.length} internal link replacements...`);
        let enrichedMarkdown = markdown;
        let replacementsMade = 0;

        // Apply replacements
        for (const link of linkPlan) {
            // Validate required fields
            if (!link.originalSnippet || !link.rewrittenSnippet || !link.targetArticleSlug) {
                console.warn(`⚠ Link missing required fields:`, link);
                continue;
            }

            if (enrichedMarkdown.includes(link.originalSnippet)) {
                // VALIDATION: Ensure the rewrite doesn't add extra text (which causes duplication)
                // We strip the markdown link syntax from rewrittenSnippet and compare with originalSnippet
                // They MUST be identical (ignoring minor whitespace/punctuation differences)

                const cleanRewrite = link.rewrittenSnippet
                    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert [text](link) -> text
                    .trim();

                const cleanOriginal = link.originalSnippet.trim();

                // Check likeness (allow minor punctuation diffs, but strict on words)
                const isIdentical = cleanRewrite.replace(/[^\w\s]/g, '') === cleanOriginal.replace(/[^\w\s]/g, '');

                if (isIdentical) {
                    if (link.rewrittenSnippet.includes('](')) {
                        enrichedMarkdown = enrichedMarkdown.replace(link.originalSnippet, link.rewrittenSnippet);
                        replacementsMade++;
                        console.log(`✓ Replaced snippet for slug: ${link.targetArticleSlug}`);
                    } else {
                        console.warn(`⚠ Rewritten snippet missing markdown link format:`, link.rewrittenSnippet);
                    }
                } else {
                    console.warn(`⚠ REJECTED rewrite to prevent duplication or hallucination.`);
                    console.warn(`  Original: "${cleanOriginal}"`);
                    console.warn(`  Cleaned Rewrite: "${cleanRewrite}"`);
                    console.warn(`  Reason: Rewrite added/changed text content.`);
                }
            } else {
                const preview = link.originalSnippet.length > 50
                    ? link.originalSnippet.substring(0, 50) + '...'
                    : link.originalSnippet;
                console.warn(`⚠ Original snippet not found in markdown:`, preview);
            }
        }

        console.log(`Internal linking complete: ${replacementsMade}/${linkPlan.length} links applied`);
        return enrichedMarkdown;

    } catch (error) {
        console.error("Error generating internal links:", error);
        return markdown; // Return original if failure
    }
}
