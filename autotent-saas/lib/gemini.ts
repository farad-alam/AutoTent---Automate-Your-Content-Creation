import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper for delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateBlogContent(keyword: string, apiKey: string, intent: string = 'informational') {
  console.log(`Generating AI content for keyword: ${keyword}`);

  // Validate API key
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Gemini API key is required. Please add your API key in website settings.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Modular Prompt System
  const PROMPTS: Record<string, string> = {
    informational: `You are an expert niche blogger and SEO content writer with real-world, hands-on experience.

Write a 100% original, in-depth, SEO-optimized informational article targeting:

Primary keyword: {{PRIMARY KEYWORD}}

SEARCH INTENT:
- Identify and match the dominant search intent (informational / how-to / beginner-friendly).
- Focus on solving the reader’s core problem clearly and completely.

TARGET AUDIENCE:
- Write for curious beginners and intermediate readers.
- Assume the reader wants practical, real-world guidance — not theory.

WRITING STYLE & TONE:
- Use natural, human-like language.
- Add emotion, curiosity, and light storytelling where appropriate.
- Write like a real expert explaining something to a friend.
- Friendly, trustworthy, and confident tone.
- Avoid fluff, repetition, clichés, and AI-sounding phrases.
- No robotic intros like “In today’s digital world.”
- Keep sentences short and punchy. Avoid long, complex sentence structures.

KEYWORD STRATEGY (NO STUFFING):
- Use ONE primary keyword.
- Naturally include relevant semantic and related keywords.
- Place the primary keyword organically in:
  - The first 100 words
  - Relevant H2 and H3 subheadings
- Never force keywords.
- Prioritize clarity and context over keyword density.

CONTENT QUALITY (E-E-A-T):
- Demonstrate real experience with examples, use cases, or scenarios.
- Explain not just “what” but also “why” and “how.”
- Mention common mistakes, misconceptions, or limitations where relevant.
- Provide accurate, helpful, and trustworthy information.
- Avoid thin, generic, or surface-level explanations.

STRUCTURE & READABILITY:
- Use clear, logical H2 and H3 headings.
- Short paragraphs (2–3 lines max).
- Use bullet points and numbered lists where helpful.
- Simple, easy-to-scan language.
- Optimize for both humans and Google.

ARTICLE STRUCTURE:

1. SEO Title (H1)
   - Include the primary keyword.
   - Make it compelling and click-worthy.

2. Meta Description
   - 150–160 characters.
   - Include the primary keyword.
   - Encourage curiosity and clicks.

3. Introduction
   - Start directly with the content. DO NOT use an 'Introduction' H2 header.
   - Start with a relatable problem, curiosity, or real-life scenario.
   - Include the primary keyword naturally within the first 100 words.
   - Clearly explain what the reader will learn and why it matters.

4. Main Content Sections
   - Use H2 and H3 subheadings.
   - Cover the topic step by step.
   - Include:
     - Clear explanations
     - Practical examples or mini-stories
     - Common beginner questions
     - Mistakes to avoid (if applicable)

5. Practical Tips / Key Takeaways
   - Use bullet points or numbered lists.
   - Make them actionable and realistic.
   - Focus on things the reader can apply immediately.

6. Optional FAQ Section
   - Answer 3–5 common, natural questions related to the topic.
   - Write in a conversational tone.
   - Do NOT use "Q:" or "A:" prefixes.

7. Conclusion
   - Summarize naturally without keyword stuffing.
   - Reinforce clarity and confidence.
   - End with encouragement, insight, or a practical next step.

AVOID:
- Keyword stuffing
- Generic filler content
- Overly formal or academic tone
- Repetitive phrasing
- Mentioning AI, tools, or disclaimers

FINAL GOAL:
The article should feel written by a real expert, be useful enough to bookmark, satisfy search intent fully, and be optimized to rank on Google in 2026.

Output Format: JSON (strict JSON only, no markdown code blocks)
{
  "title": "Engaging, SEO-optimized title (max 60 chars)",
  "metaDescription": "Compelling meta description (max 160 chars)",
  "slug": "seo-friendly-url-slug (must match keyword, kebab-case)",
  "excerpt": "Short summary of the article (20-30 words)",
  "bodyMarkdown": "Full article in Markdown format. DO NOT include the post Title or H1 at the beginning. Start directly with the Introduction."
}`,
    howto: `You are an expert niche blogger and SEO content writer with real-world, hands-on experience.

Write a 100% original, step-by-step, SEO-optimized HOW-TO article targeting:

Primary keyword: {{PRIMARY KEYWORD}}

SEARCH INTENT (HOW-TO):
- The reader wants clear, actionable instructions to complete a specific task.
- Focus on solving the problem quickly, correctly, and confidently.
- Prioritize practical steps over theory.

TARGET AUDIENCE:
- Beginners to intermediate users.
- Assume little to no prior knowledge.
- Write in a reassuring, easy-to-follow manner.

WRITING STYLE & TONE:
- Clear, practical, and human.
- Friendly and encouraging, like a guide walking the reader through each step.
- Use simple language and direct instructions.
- Avoid fluff, jargon, and AI-sounding phrases.
- No robotic intros or generic SEO filler.
- Keep sentences short and punchy. Avoid long, complex sentence structures.

KEYWORD STRATEGY (NO STUFFING):
- Use ONE primary keyword.
- Naturally include related and semantic keywords.
- Place the primary keyword organically in:
  - The first 100 words
  - One or more relevant H2 subheadings
- Never force keywords.
- Write for clarity first, SEO second.

CONTENT QUALITY (E-E-A-T):
- Demonstrate real experience by explaining why each step matters.
- Include practical tips, warnings, and common mistakes.
- Mention tools, materials, or prerequisites when needed.
- Be honest about limitations, risks, or when something may not work.
- Avoid shallow or generic instructions.

STRUCTURE & READABILITY:
- Use clear H2 and H3 headings.
- Short paragraphs (2–3 lines max).
- Use numbered steps for the main process.
- Use bullet points for tips, tools, and warnings.
- Make the content easy to scan and follow on mobile.

ARTICLE STRUCTURE:

1. SEO Title (H1)
   - Start with “How to…”
   - Include the primary keyword naturally.
   - Promise a clear outcome.

2. Meta Description
   - 150–160 characters.
   - Include the primary keyword.
   - Emphasize ease, speed, or results.

3. Introduction
   - Start directly with the content. DO NOT use an 'Introduction' H2 header.
   - Briefly describe the problem or task.
   - Reassure the reader that it’s achievable.
   - Include the primary keyword naturally within the first 100 words.
   - Clearly state what the reader will accomplish by the end.

4. Prerequisites / What You’ll Need (if applicable)
   - Tools, materials, accounts, or conditions required.
   - Keep it simple and practical.

5. Step-by-Step Instructions (Core Section)
   - Use numbered steps in logical order.
   - Explain each step clearly and concisely.
   - Add small tips or notes under steps when helpful.
   - Avoid skipping steps or assuming prior knowledge.

6. Common Mistakes & How to Avoid Them
   - List real-world errors beginners make.
   - Explain why they happen and how to prevent them.

7. Pro Tips / Best Practices
   - Optional but valuable.
   - Share expert-level insights that improve results or save time.

8. Optional Troubleshooting / FAQ
   - Answer 3–5 common “What if…” or “Why isn’t this working?” questions.
   - Keep answers short and practical.
   - Do NOT use "Q:" or "A:" prefixes.

9. Conclusion
   - Summarize the process briefly.
   - Reinforce confidence.
   - Encourage the reader to take action or try the steps now.

AVOID:
- Keyword stuffing
- Overly technical explanations without context
- Vague steps like “just optimize it”
- Repetitive or filler content
- Mentioning AI tools or disclaimers

FINAL GOAL:
The article should help the reader successfully complete the task on their first attempt, feel confident following the steps, and be optimized to rank for How-To search intent in Google (2026 standards).

Output Format: JSON (strict JSON only, no markdown code blocks)
{
  "title": "Engaging, SEO-optimized title (max 60 chars)",
  "metaDescription": "Compelling meta description (max 160 chars)",
  "slug": "seo-friendly-url-slug (must match keyword, kebab-case)",
  "excerpt": "Short summary of the article (20-30 words)",
  "bodyMarkdown": "Full article in Markdown format. DO NOT include the post Title or H1 at the beginning. Start directly with the Introduction."
}`,
    "commercial": `You are an expert niche blogger and SEO content writer with real-world, hands-on experience.

Write a 100% original, SEO-optimized COMMERCIAL INTENT article targeting:

Primary keyword: {{PRIMARY KEYWORD}}

SEARCH INTENT (COMMERCIAL – INVESTIGATION):
- The reader is considering a specific product, service, or solution.
- They want to evaluate whether it is right for them before making a purchase.
- Focus on helping the reader make an informed decision.
- Do NOT compare with competitors or alternatives.

TARGET AUDIENCE:
- Buyers who are aware of the solution but cautious.
- Readers looking for honest, experience-based insights.
- Write in a balanced, realistic, and trust-building tone.

WRITING STYLE & TONE:
- Natural, conversational, and confident.
- Honest and transparent — not salesy.
- Friendly expert explaining pros, cons, and real-world usage.
- Avoid hype, exaggeration, and promotional language.
- No AI-sounding phrases or generic marketing talk.
- Keep sentences short and punchy. Avoid long, complex sentence structures.

KEYWORD STRATEGY (NO STUFFING):
- Use ONE primary keyword.
- Naturally include related and semantic keywords.
- Place the primary keyword organically in:
  - The first 100 words
  - One or more relevant H2 or H3 subheadings
- Never force keywords.
- Prioritize clarity and trust over keyword density.

CONTENT QUALITY (E-E-A-T):
- Demonstrate real or simulated hands-on experience.
- Explain how the product/service works in real scenarios.
- Clearly state who it is best for and who it is NOT for.
- Mention limitations, drawbacks, or deal-breakers honestly.
- Avoid thin, generic reviews or surface-level praise.

STRUCTURE & READABILITY:
- Use clear H2 and H3 headings.
- Short paragraphs (2–3 lines max).
- Use bullet points for pros, cons, features, and use cases.
- Keep language simple and buyer-focused.
- Optimize for skimmability and mobile reading.

ARTICLE STRUCTURE:

1. SEO Title (H1)
   - Include the primary keyword.
   - Make it decision-focused (e.g., “Is it worth it?”, “Honest review”).

2. Meta Description
   - 150–160 characters.
   - Include the primary keyword.
   - Encourage evaluation, not urgency.

3. Introduction
   - Start directly with the content. DO NOT use an 'Introduction' H2 header.
   - Acknowledge the reader’s hesitation or curiosity.
   - Clearly state what the article will help them decide.
   - Include the primary keyword naturally within the first 100 words.

4. What Is {{Product/Service}}?
   - Brief, clear explanation.
   - Focus on purpose and main use case.
   - Avoid generic or marketing-heavy descriptions.

5. Key Features & Benefits
   - Explain how each feature helps in real life.
   - Focus on outcomes, not just specs.

6. Real-World Use Cases
   - Describe practical scenarios where it performs well.
   - Mention where it may struggle or fall short.

7. Pros and Cons
   - Honest, balanced bullet list.
   - Do not exaggerate positives or hide negatives.

8. Who Should Use It (and Who Shouldn’t)
   - Clearly define ideal users.
   - Warn users for whom it may not be suitable.

9. Common Questions or Concerns
   - Address objections or doubts buyers usually have.
   - Keep answers practical and transparent.
   - Do NOT use "Q:" or "A:" prefixes.

10. Verdict / Final Thoughts
    - Summarize without pushing a hard sale.
    - Help the reader decide confidently.
    - Soft encouragement, no aggressive CTA.

AVOID:
- Comparisons with competitors
- “Best” claims without context
- Overly promotional language
- Keyword stuffing
- Mentioning AI tools or disclaimers

FINAL GOAL:
The article should help a cautious buyer confidently decide whether the product or service is right for them, feel honest and trustworthy, and be optimized to rank for commercial intent searches in Google (2026 standards).

Output Format: JSON (strict JSON only, no markdown code blocks)
{
  "title": "Engaging, SEO-optimized title (max 60 chars)",
  "metaDescription": "Compelling meta description (max 160 chars)",
  "slug": "seo-friendly-url-slug (must match keyword, kebab-case)",
  "excerpt": "Short summary of the article (20-30 words)",
  "bodyMarkdown": "Full article in Markdown format. DO NOT include the post Title or H1 at the beginning. Start directly with the Introduction."
}`,
    "comparison": `You are an expert niche blogger and SEO content writer with real-world, hands-on experience.

Write a 100% original, SEO-optimized COMPARISON INTENT article targeting:

Primary keyword: {{PRIMARY KEYWORD}}   (e.g., “X vs Y”)

SEARCH INTENT (COMPARISON):
- The reader is deciding between two specific products or solutions.
- They want a clear, honest, side-by-side evaluation.
- The goal is to help them choose the option that best fits their needs.

TARGET AUDIENCE:
- Buyers who are aware of both options.
- Readers looking for clarity, not marketing hype.
- Write in a neutral, decision-focused tone.

WRITING STYLE & TONE:
- Objective, honest, and practical.
- Confident but unbiased.
- Explain trade-offs clearly.
- Avoid emotional hype, exaggeration, or brand favoritism.
- No AI-sounding phrases or generic marketing language.
- Keep sentences short and punchy. Avoid long, complex sentence structures.

KEYWORD STRATEGY (NO STUFFING):
- Use ONE primary keyword.
- Naturally include semantic and related keywords (e.g., “differences,” “which is better,” “pros and cons”).
- Place the primary keyword organically in:
  - The first 100 words
  - The H1 title
  - One or more relevant H2 subheadings
- Never force keywords.

CONTENT QUALITY (E-E-A-T):
- Demonstrate real or simulated hands-on experience with both products.
- Explain how each performs in real-world scenarios.
- Highlight strengths AND weaknesses for each option.
- Be honest about limitations and deal-breakers.
- Avoid shallow or spec-based comparisons only.

STRUCTURE & READABILITY:
- Use clear H2 and H3 headings.
- Short paragraphs (2–3 lines max).
- Use tables and bullet points where helpful.
- Optimize for skimmability and mobile readers.

ARTICLE STRUCTURE:

1. SEO Title (H1)
   - Include both product names.
   - Format clearly (e.g., “X vs Y: Which One Is Better for [Use Case]?”).

2. Meta Description
   - 150–160 characters.
   - Include both product names.
   - Emphasize decision-making clarity.

3. Introduction
   - Start directly with the content. DO NOT use an 'Introduction' H2 header.
   - Acknowledge the confusion between choosing X or Y.
   - State that the article will help the reader decide.
   - Include the primary keyword naturally within the first 100 words.

4. Quick Comparison Summary (Optional but Recommended)
   - Brief verdict or overview.
   - Who should choose X vs who should choose Y.

5. Feature-by-Feature Comparison
   - Compare key features side by side.
   - Explain why differences matter in real use.
   - Avoid spec dumping without context.

6. Performance & Real-World Use
   - How each product performs in practical scenarios.
   - Strengths and weaknesses under real conditions.

7. Pros and Cons
   - Separate bullet lists for X and Y.
   - Keep them honest and balanced.

8. Pricing & Value (if applicable)
   - Discuss value for money, not just price.
   - Avoid hard selling.

9. Which One Should You Choose?
   - Clear guidance based on:
     - User type
     - Budget
     - Use case
   - No absolute “best” claim without context.

10. FAQ Section (Optional)
    - Answer common comparison-related questions.
    - Keep answers short and practical.
    - Do NOT use "Q:" or "A:" prefixes.

11. Final Verdict
    - Summarize key differences.
    - Help the reader make a confident decision.
    - Soft recommendation, no aggressive CTA.

AVOID:
- Declaring a universal “winner” without context
- Brand bias or promotional tone
- Keyword stuffing
- Thin or surface-level comparisons
- Mentioning AI tools or disclaimers

FINAL GOAL:
The article should clearly explain the differences between X and Y, help the reader choose the right option for their specific needs, and be optimized to rank for comparison intent keywords in Google (2026 standards).

Output Format: JSON (strict JSON only, no markdown code blocks)
{
  "title": "Engaging, SEO-optimized title (max 60 chars)",
  "metaDescription": "Compelling meta description (max 160 chars)",
  "slug": "seo-friendly-url-slug (must match keyword, kebab-case)",
  "excerpt": "Short summary of the article (20-30 words)",
  "bodyMarkdown": "Full article in Markdown format. DO NOT include the post Title or H1 at the beginning. Start directly with the Introduction."
}`
  };

  const selectedTemplate = PROMPTS[intent] || PROMPTS['informational'];
  const prompt = selectedTemplate.replace('{{PRIMARY KEYWORD}}', keyword);

  // PRODUCTION MODELS - Main article generation
  // gemini-flash-latest: Proven working model (auto-updates to latest stable)
  // gemini-2.5-flash: Fallback (retiring June 2026)
  // gemini-2.5-flash-lite: Emergency fallback when quota exceeded
  const modelNamesToTry = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
  const maxRetriesPerModel = 2; // Retry each model twice before moving to next

  for (const modelName of modelNamesToTry) {
    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        console.log(`Trying model: ${modelName} (attempt ${attempt}/${maxRetriesPerModel})`);
        const currentModel = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
            temperature: 0.7
          }
        });

        const result = await currentModel.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        console.log(`✓ Model ${modelName} worked! Parsing response...`);

        let cleanedText = text.trim();

        // Find the first '{' and the last '}' to handle potential markdown or explanation text outside JSON
        const firstBrace = cleanedText.indexOf('{');
        const lastBrace = cleanedText.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
        }

        let content;
        try {
          content = JSON.parse(cleanedText);
        } catch (parseError: any) {
          console.error(`JSON parsing failed for ${modelName}:`, parseError.message);
          console.error(`Raw response (first 500 chars):`, cleanedText.substring(0, 500));

          // If parsing fails and we have retries left for this model, throw to retry
          if (attempt < maxRetriesPerModel) {
            console.log(`Retrying ${modelName} due to JSON parse error...`);
            await sleep(2000); // Wait 2s before retry
            throw new Error(`Invalid JSON response from AI: ${parseError.message}`);
          }

          // Last attempt - try one more aggressive fix before giving up
          throw new Error(`Invalid JSON response from AI: ${parseError.message}`);
        }

        content.slug = keyword.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        content.bodyMarkdown = content.bodyMarkdown.replace(/^#\s+.*?\n+/, '').trim();
        if (!content.excerpt) {
          const plainText = content.bodyMarkdown.replace(/[#*`]/g, '');
          content.excerpt = plainText.split(' ').slice(0, 30).join(' ') + '...';
        }

        console.log('✓ AI content generated successfully:', content.title);
        return content;

      } catch (error: any) {
        console.log(`✗ Model ${modelName} attempt ${attempt} failed:`, error.message);

        if (error.message.includes('429')) {
          console.log("Rate limited. Waiting 10s before retry...");
          await sleep(10000);
        }

        // If this is the last attempt for this model, break to try next model
        if (attempt === maxRetriesPerModel) {
          console.log(`All attempts exhausted for ${modelName}, trying next model...`);
          break;
        }

        // Otherwise, wait a bit and retry same model
        await sleep(2000);
      }
    }
  }

  // All models and retries failed
  throw new Error('AI content generation failed: All models failed after multiple attempts. Please try again or check your API key.');
}

export async function generateImageSearchTerm(keyword: string, apiKey: string): Promise<string> {
  console.log(`Generating image search term for: ${keyword}`);

  if (!apiKey || apiKey.trim() === '') {
    console.warn("No API key provided for image search term, using keyword fallback.");
    return keyword;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const prompt = `You are a visual curator.
    Topic: "${keyword}"
    Task: Provide a ONE single, simple, purely visual search term to find a high-quality stock photo on Unsplash.
    Rules:
    - NO abstract concepts (e.g. "success", "growth").
    - NO text on image requests.
    - Concrete nouns and scenes only (e.g. "modern office desk", "hiking boots on trail", "fresh coffee beans").
    - Max 3-4 words.
    - Output strictly the term, nothing else.`;

  const modelNames = ["gemini-2.5-flash"];

  for (const modelName of modelNames) {
    try {
      const currentModel = genAI.getGenerativeModel({ model: modelName });
      const result = await currentModel.generateContent(prompt);
      const term = result.response.text().trim().replace(/^["']|["']$/g, '');

      console.log(`✓ Image search term (${modelName}): "${term}"`);
      return term;
    } catch (error: any) {
      console.warn(`Failed to generate image search term with ${modelName}:`, error.message);
      if (error.message.includes('429')) await sleep(5000);
      continue;
    }
  }

  console.warn("All models failed for image search term, using keyword fallback.");
  return keyword;
}

export async function generateBatchSearchTerms(headings: string[], mainTopic: string, apiKey: string, type: 'image' | 'video'): Promise<Record<string, string>> {
  console.log(`Generating batch ${type} search terms for ${headings.length} headings. Context: ${mainTopic}`);

  if (headings.length === 0) return {};

  if (!apiKey || apiKey.trim() === '') {
    console.warn("No API key provided for batch search terms, returning empty map.");
    return {};
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const prompt = `You are a visual curator. 
    Context: The article is about "${mainTopic}".
    Task: For each provided Article Heading, generate a ONE single, simple, purely visual search term to find a high-quality ${type} (stock photo or youtube video).
    
    Headings:
    ${headings.map(h => `- ${h}`).join('\n')}

    Rules:
    - MANDATORY: You MUST include the Main Topic ("${mainTopic}") in every search term.
    - Example: If topic is "Cat Health" and heading is "Fishy Smell", search for "Cat smelling bad", NOT "Fish".
    - Example: If topic is "Dog Training" and heading is "Sit Command", search for "Dog sitting", NOT "Chair".
    - NO metaphors or idioms. Use literal, descriptive visual terms.
    - NO text on image requests.
    - Concrete nouns and scenes only.
    - Max 4-6 words per term.
    - Return valid JSON object where keys are the exact headings provided and values are the search terms.
    - JSON ONLY. No markdown blocks.`;

  const modelNames = ["gemini-2.5-flash"];

  for (const modelName of modelNames) {
    try {
      const currentModel = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192
        }
      });
      const result = await currentModel.generateContent(prompt);
      const text = result.response.text().trim()
        .replace(/^```json\s*/g, '')
        .replace(/^```\s*/g, '')
        .replace(/\s*```$/g, '');

      const terms = JSON.parse(text);
      console.log(`✓ Batch terms generated with ${modelName}`);
      return terms;
    } catch (error: any) {
      console.warn(`Batch generation failed with ${modelName}:`, error.message);
      if (error.message.includes('429')) await sleep(10000);
      continue;
    }
  }

  console.warn("All models failed for batch search terms. Returning empty map.");
  return {};
}
