import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
});

export async function generateBlogContent(keyword: string) {
    const prompt = `
    You are an expert SEO content writer.
    Write a comprehensive blog post about the keyword: "${keyword}".
    
    Output Format: JSON with the following structure:
    {
      "title": "Engaging Title",
      "metaDescription": "SEO optimized meta description (160 chars max)",
      "slug": "seo-friendly-slug",
      "bodyMarkdown": "Full blog post content in Markdown format. Use H2, H3, bullet points, and bold text."
    }
  `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean up JSON if code blocks are present
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        return JSON.parse(cleanedText);
    } catch (e) {
        console.error("Failed to parse Gemini JSON", text);
        throw new Error("AI Generation Failed");
    }
}
