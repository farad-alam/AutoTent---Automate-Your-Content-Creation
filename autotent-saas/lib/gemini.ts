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
}`
  };

  const selectedTemplate = PROMPTS[intent] || PROMPTS['informational'];
  const prompt = selectedTemplate.replace('{{PRIMARY KEYWORD}}', keyword);

  // STABLE PRODUCTION MODELS
  const modelNamesToTry = ["gemini-flash-latest"];

  let lastError: any = null;

  for (const modelName of modelNamesToTry) {
    try {
      console.log(`Trying model: ${modelName}`);
      const currentModel = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" }
      });

      const result = await currentModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      console.log(`✓ Model ${modelName} worked! Parsing response...`);

      let cleanedText = text.trim();
      cleanedText = cleanedText.replace(/^```json\s*/g, '');
      cleanedText = cleanedText.replace(/^```\s*/g, '');
      cleanedText = cleanedText.replace(/\s*```$/g, '');
      cleanedText = cleanedText.trim();

      let content;
      try {
        content = JSON.parse(cleanedText);
      } catch (parseError: any) {
        console.error(`JSON parsing failed for ${modelName}:`, parseError.message);
        console.error(`Raw response (first 500 chars):`, cleanedText.substring(0, 500));

        // Treat JSON parse errors as retryable - the model might succeed on retry
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
      lastError = error;
      console.log(`✗ Model ${modelName} failed:`, error.message);

      if (error.message.includes('429')) {
        console.log("Rate limited. Waiting 15s before trying next model...");
        await sleep(15000);
      }
      continue;
    }
  }

  // All models failed - throw error with specific details
  console.error('All Gemini models failed. Throwing error to prevent publishing fallback content.');

  // Determine specific error type
  let errorMessage = 'AI content generation failed';
  if (lastError) {
    if (lastError.message.includes('Invalid JSON response')) {
      errorMessage = 'AI content generation failed: The AI returned malformed content. Please try again.';
    } else if (lastError.message.includes('429') || lastError.message.includes('Too Many Requests')) {
      errorMessage = 'AI content generation failed: Rate limit exceeded. Your API key has hit the quota limit. Please wait or upgrade your plan.';
    } else if (lastError.message.includes('404') || lastError.message.includes('Not Found')) {
      errorMessage = 'AI content generation failed: Model not found. Your API key may not have access to this model. Try generating a new API key.';
    } else if (lastError.message.includes('403') || lastError.message.includes('Forbidden')) {
      errorMessage = 'AI content generation failed: Access denied. Check your API key permissions.';
    } else if (lastError.message.includes('401') || lastError.message.includes('Unauthorized')) {
      errorMessage = 'AI content generation failed: Invalid API key. Please check your Gemini API key in website settings.';
    } else {
      errorMessage = `AI content generation failed: ${lastError.message}`;
    }
  }

  throw new Error(errorMessage);
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

  const modelNames = ["gemini-flash-latest"];

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
    - ALWAYS combine the MAIN TOPIC with the HEADING context.
    - Example: If topic is "Dog Health" and heading is "Training", search for "Dog training", NOT just "Training".
    - NO abstract concepts.
    - Concrete nouns and scenes only.
    - Max 4-5 words per term.
    - Return valid JSON object where keys are the exact headings provided and values are the search terms.
    - JSON ONLY. No markdown blocks.`;

  const modelNames = ["gemini-flash-latest"];

  for (const modelName of modelNames) {
    try {
      const currentModel = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" }
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
