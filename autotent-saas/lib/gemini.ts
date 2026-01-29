import { GoogleGenerativeAI } from "@google/generative-ai";
import { getPromptForIntent } from './prompts';
import { generateGroqContent } from './groq';

// Helper for delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateBlogContent(keyword: string, apiKey: string, intent: string = 'informational', sources: string = "") {
  console.log(`Generating AI content for keyword: ${keyword}`);

  // Validate API key
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Gemini API key is required. Please add your API key in website settings.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Use shared prompt system (same as Groq for consistency)
  const prompt = getPromptForIntent(intent, keyword, sources);


  // PRODUCTION MODELS - Main  // Model fallback order: fastest/lightest first, then more capable models
  // gemini-2.5-flash-lite: Fastest, lowest quota usage (try first)
  // gemini-2.5-flash: Balanced speed and quality
  // gemini-flash-latest: Most capable, auto-updates to latest stable (last resort)
  const modelNamesToTry = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"];
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
        content.focusKeyword = content.focusKeyword || keyword;
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

  const prompt = `You are a visual curator.
    Topic: "${keyword}"
    Task: Provide a ONE single, simple, purely visual search term to find a high-quality stock photo on Unsplash.
    Rules:
    - NO abstract concepts (e.g. "success", "growth").
    - NO text on image requests.
    - Concrete nouns and scenes only (e.g. "modern office desk", "hiking boots on trail", "fresh coffee beans").
    - Max 3-4 words.
    - Output strictly the term, nothing else.`;

  // 1. Try Gemini if API key is provided
  if (apiKey && apiKey.trim() !== '') {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelNames = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"];

    for (const modelName of modelNames) {
      try {
        const currentModel = genAI.getGenerativeModel({ model: modelName });
        const result = await currentModel.generateContent(prompt);
        const term = result.response.text().trim().replace(/^["']|["']$/g, '');

        console.log(`✓ Image search term (${modelName}): "${term}"`);
        return term;
      } catch (error: any) {
        console.warn(`Failed to generate image search term with ${modelName}:`, error.message);
        if (error.message.includes('429')) await sleep(2000);
        continue;
      }
    }
  } else {
    console.warn("No Gemini API key provided. Skipping straight to Groq fallback.");
  }

  // 2. Fallback to Groq (if Gemini failed or no key)
  console.log("Using Groq fallback for image search term...");
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("No GROQ_API_KEY found in environment vars for fallback.");
    }
    const groqTerm = await generateGroqContent(prompt, process.env.GROQ_API_KEY);
    const cleanTerm = groqTerm.trim().replace(/^["']|["']$/g, '');
    console.log(`✓ Image search term (Groq Fallback): "${cleanTerm}"`);
    return cleanTerm;
  } catch (groqError: any) {
    console.error("Groq fallback failed:", groqError.message);
    return keyword;
  }
}

export async function generateBatchSearchTerms(headings: string[], mainTopic: string, apiKey: string, type: 'image' | 'video'): Promise<Record<string, string>> {
  console.log(`Generating batch ${type} search terms for ${headings.length} headings. Context: ${mainTopic}`);

  if (headings.length === 0) return {};

  const prompt = `You are a visual curator. 
    Context: The article is about "${mainTopic}".
    Task: For each provided Article Heading, generate a ONE single, simple, purely visual search term to find a high-quality ${type} (stock photo or youtube video).
    
    Headings:
    ${headings.map(h => `- ${h}`).join('\n')}

    Rules:
    - Context: Use the Main Topic ("${mainTopic}") to understand the context, but do NOT force it into the search term if it makes it abstract.
    - VISUALS FIRST: Describe a physical object, scene, or action that represents the heading.
    - Example: Context "Coffee", Heading "Health Benefits" -> Search for "Steaming cup of black coffee", NOT "Coffee benefits".
    - Example: Context "Digital Marketing", Heading "SEO Strategy" -> Search for "Person typing on laptop close up", NOT "Digital Marketing SEO".
    - NO abstract concepts (e.g. "steps", "mistakes", "success").
    - NO text on image requests.
    - Concrete nouns and scenes only.
    - Max 3-5 words per term.
    - Return valid JSON object where keys are the exact headings provided and values are the search terms.
    - JSON ONLY. No markdown blocks.`;

  // 1. Try Gemini if API key is provided
  if (apiKey && apiKey.trim() !== '') {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelNames = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"];

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
  } else {
    console.warn("No Gemini API key for batch terms. Skipping straight to Groq fallback.");
  }

  // 2. Fallback to Groq
  console.log("Gemini failed/exhausted. Falling back to Groq for batch search terms...");
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("No GROQ_API_KEY for batch fallback.");
    }
    const groqText = await generateGroqContent(prompt, process.env.GROQ_API_KEY, 'llama-3.3-70b-versatile');
    const cleanText = groqText.trim()
      .replace(/^```json\s*/g, '')
      .replace(/^```\s*/g, '')
      .replace(/\s*```$/g, '');

    const terms = JSON.parse(cleanText);
    console.log(`✓ Batch terms generated (Groq Fallback)`);
    return terms;
  } catch (groqError: any) {
    console.error("Groq batch fallback failed:", groqError.message);
    return {};
  }
}
