import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper for delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateBlogContent(keyword: string, apiKey: string) {
  console.log(`Generating AI content for keyword: ${keyword}`);

  // Validate API key
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Gemini API key is required. Please add your API key in website settings.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const prompt = `You are an expert SEO content writer.
Write a comprehensive, engaging blog post about: "${keyword}"

Requirements:
- Professional tone with valuable insights
- SEO-optimized with natural keyword usage
- Well-structured with clear headings
- 800-1200 words
- Include practical tips and examples

Output Format: JSON (strict JSON only, no markdown code blocks)
{
  "title": "Engaging, SEO-optimized title (max 60 chars)",
  "metaDescription": "Compelling meta description (max 160 chars)",
  "slug": "seo-friendly-url-slug (must match keyword, kebab-case)",
  "excerpt": "Short summary of the article (20-30 words)",
  "bodyMarkdown": "Full article in Markdown format. DO NOT include the post Title or H1 at the beginning. Start directly with the Introduction."
}`;

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
