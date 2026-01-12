import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

// Using the correct model name for the current SDK version
// Try models in order of preference
const getModel = () => {
  // List of model names to try (newest to oldest)
  // Prioritizing gemini-flash-latest as it is confirmed working for this account
  const modelNames = [
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-pro-latest"
  ];

  // Return the first model (will try during actual generation)
  return genAI.getGenerativeModel({ model: modelNames[0] });
};

const model = getModel();

export async function generateBlogContent(keyword: string) {
  console.log(`Generating AI content for keyword: ${keyword}`);

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
  "slug": "seo-friendly-url-slug",
  "bodyMarkdown": "Full article in Markdown format with ## H2, ### H3, **bold**, lists, etc."
}`;

  // Try multiple model names if one fails
  const modelNamesToTry = [
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-pro-latest"
  ];

  for (const modelName of modelNamesToTry) {
    try {
      console.log(`Trying model: ${modelName}`);
      const currentModel = genAI.getGenerativeModel({ model: modelName });

      const result = await currentModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      console.log(`✓ Model ${modelName} worked! Parsing response...`);

      // Clean up response - remove code blocks if present
      let cleanedText = text.trim();

      // Remove markdown code blocks
      cleanedText = cleanedText.replace(/^```json\s*/g, '');
      cleanedText = cleanedText.replace(/^```\s*/g, '');
      cleanedText = cleanedText.replace(/\s*```$/g, '');
      cleanedText = cleanedText.trim();

      // Parse JSON
      const content = JSON.parse(cleanedText);

      console.log('✓ AI content generated successfully:', content.title);
      return content;

    } catch (error: any) {
      console.log(`✗ Model ${modelName} failed:`, error.message);
      // Continue to next model
      continue;
    }
  }

  // If all models fail, use fallback
  console.error('All Gemini models failed. Using fallback content.');
  const title = `Complete Guide to ${keyword}`;
  const slug = keyword.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return {
    title: title,
    metaDescription: `Discover everything you need to know about ${keyword}. Expert insights, tips, and comprehensive analysis.`,
    slug: slug,
    bodyMarkdown: `# ${title}

## Introduction

Welcome to our comprehensive guide on **${keyword}**. This article covers the essential information you need.

## Why ${keyword} Matters

${keyword} is an important topic that has gained significant attention. Understanding it can help you make better decisions.

## Key Takeaways

- Comprehensive understanding of the subject
- Practical applications and examples  
- Expert insights and best practices
- Step-by-step guidance

## Getting Started

Here's how to approach ${keyword}:

1. Learn the fundamentals
2. Apply best practices
3. Avoid common mistakes
4. Continuously improve

## Conclusion

${keyword} is a valuable topic worth exploring. This guide provides you with the foundation to succeed.

*Note: This is fallback content generated because Gemini API models are not currently accessible.*`
  };
}
