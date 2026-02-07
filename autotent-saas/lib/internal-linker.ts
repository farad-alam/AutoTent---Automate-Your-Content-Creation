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
    limit: number = 10,
    topicClusterId?: string
): Promise<LinkableArticle[]> {
    const supabase = createServiceClient();
    let clusterKeywords: Set<string> = new Set();
    let pillarKeyword: string | null = null;

    // 1. If Cluster ID provided, fetch keywords of jobs in that cluster
    if (topicClusterId) {
        // Fetch all jobs in cluster to get their keywords
        const { data: clusterJobs } = await supabase
            .from('jobs')
            .select('keyword')
            .eq('topic_cluster_id', topicClusterId);

        if (clusterJobs) {
            clusterJobs.forEach(j => {
                if (j.keyword) clusterKeywords.add(j.keyword.toLowerCase());
            });
        }

        // Fetch Pillar Job Keyword
        const { data: cluster } = await supabase
            .from('topic_clusters')
            .select('pillar_job_id')
            .eq('id', topicClusterId)
            .single();

        if (cluster?.pillar_job_id) {
            const { data: pillarJob } = await supabase
                .from('jobs')
                .select('keyword')
                .eq('id', cluster.pillar_job_id)
                .single();
            if (pillarJob?.keyword) {
                const k = pillarJob.keyword.toLowerCase();
                clusterKeywords.add(k);
                pillarKeyword = k;
            }
        }
    }

    // 2. Fetch candidates from the same project
    const { data: articles, error } = await supabase
        .from('articles_metadata')
        .select('*')
        .eq('project_id', projectId)
        .order('published_at', { ascending: false })
        .limit(100); // Fetch a batch to rank

    if (error || !articles) {
        console.error("Error fetching linkable articles:", error);
        return [];
    }

    // 3. Relevance Scoring
    const currentTokens = currentKeyword.toLowerCase().split(/\s+/);

    const scoredArticles = articles.map(article => {
        let score = 0;
        const targetKeyword = (article.focus_keyword || '').toLowerCase();
        const targetTokens = targetKeyword.split(/\s+/);
        const titleTokens = article.title.toLowerCase().split(/\s+/);

        // A. Pillar Priority (Highest)
        if (pillarKeyword && targetKeyword === pillarKeyword) {
            score += 100; // Massive boost for Pillar Page
        }
        // B. Cluster Priority (High)
        else if (clusterKeywords.has(targetKeyword)) {
            score += 50; // Boost for same cluster
        }

        // C. Keyword overlap
        const keywordOverlap = currentTokens.filter(t => targetTokens.includes(t)).length;
        score += keywordOverlap * 2;

        // D. Title overlap
        const titleOverlap = currentTokens.filter(t => titleTokens.includes(t)).length;
        score += titleOverlap * 1;

        return { ...article, relevanceScore: score };
    });

    // 4. Sort by score desc, then published_at desc
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
5. **NO DUPLICATES**: NEVER link to the same "targetArticleSlug" more than once.
   - If you link to "/coffee-guide", do NOT link to it again.
   - Select DISTINCT targets.
6. **VARIETY**: Try to link to a mix of the provided candidates if possible.
7. Create natural anchor text. AVOID "read this", "click here", or exact-match keyword stuffing. Use descriptive phrases.

HEADING DETECTION EXAMPLES (DO NOT USE THESE):
❌ "## Common Culprits"  
❌ "# Why Does Cat Poop Smell?"  

CORRECT BODY TEXT EXAMPLES (USE THESE):
✓ "many cat owners notice that..."  
✓ "understanding the causes..."

CRITICAL LINK FORMAT RULES:
- Use ONLY simple markdown format: [anchor text](/slug)
- Do NOT add rel="nofollow", target="_blank"

CANDIDATES:
${candidatesDescription}

ARTICLE CONTENT:
${markdown}

OUTPUT FORMAT (CRITICAL - FOLLOW EXACTLY):
Return a JSON array where each object has these THREE fields:

1. "targetArticleSlug": the slug
2. "originalSnippet": COPY EXACT TEXT (5-15 words)
3. "rewrittenSnippet": SAME TEXT with link inserted

JSON ONLY:
    `;

    // Note: This is a simplified "replace" approach. 
    // A more robust way is to ask for "original sentence" and "rewritten sentence with link".
    // Let's optimize the prompt for the "Replacement" approach to be safer.

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
                console.log(`✓ Internal linking completed with Gemini(${modelName})`);
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

        const usedSlugs = new Set<string>();

        // Apply replacements
        for (const link of linkPlan) {
            // DEDUPLICATION: Check if we already linked to this slug
            if (usedSlugs.has(link.targetArticleSlug)) {
                console.log(`⚠ Skipping duplicate link to: ${link.targetArticleSlug}`);
                continue;
            }

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
                        usedSlugs.add(link.targetArticleSlug); // Mark as used
                        console.log(`✓ Replaced snippet for slug: ${link.targetArticleSlug} `);
                    } else {
                        console.warn(`⚠ Rewritten snippet missing markdown link format:`, link.rewrittenSnippet);
                    }
                } else {
                    console.warn(`⚠ REJECTED rewrite to prevent duplication or hallucination.`);
                    console.warn(`  Original: "${cleanOriginal}"`);
                    console.warn(`  Cleaned Rewrite: "${cleanRewrite}"`);
                    console.warn(`  Reason: Rewrite added / changed text content.`);
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
