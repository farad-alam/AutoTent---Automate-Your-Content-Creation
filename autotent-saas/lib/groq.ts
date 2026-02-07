import Groq from 'groq-sdk'
import { getPromptForIntent } from './prompts'

const GROQ_API_KEY = process.env.GROQ_API_KEY

// Default model for content generation
const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

/**
 * Generate text content using Groq AI
 * @param prompt The prompt to send to Groq
 * @param apiKey Optional user-provided API key (falls back to env var)
 * @param modelName Optional model override
 * @returns Generated text content
 */
export async function generateGroqContent(
    prompt: string,
    apiKey?: string,
    modelName?: string
): Promise<string> {
    const key = apiKey || GROQ_API_KEY

    if (!key) {
        throw new Error('Groq API key is required. Please provide an API key or set GROQ_API_KEY in environment variables.')
    }

    const groq = new Groq({
        apiKey: key,
    })

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            model: modelName || DEFAULT_MODEL,
            temperature: 0.7,
            max_tokens: 8000,
        })

        const content = completion.choices[0]?.message?.content

        if (!content) {
            throw new Error('No content generated from Groq')
        }

        return content
    } catch (error: any) {
        console.error('Groq API error:', error)
        throw new Error(`Failed to generate content with Groq: ${error.message}`)
    }
}

/**
 * Generate structured article content using Groq
 * Uses the same intent-based prompts as Gemini for consistency
 * @param topic Article topic
 * @param apiKey Optional user-provided API key
 * @param intent Article intent: 'informational', 'howto', 'commercial', or 'comparison'
 * @returns Article content with title, body, excerpt, slug, and SEO fields
 */
export async function generateGroqArticle(
    topic: string,
    apiKey?: string,
    intent: string = 'informational',
    sources: string = ""
): Promise<{
    title: string
    body: string
    excerpt: string
    metaDescription: string
    focusKeyword: string
    slug: string
    modelUsed: string
}> {
    // Use the same intent-based prompt system as Gemini
    const prompt = getPromptForIntent(intent, topic, sources)

    const response = await generateGroqContent(prompt, apiKey)

    try {
        // Helper to repair common JSON issues from LLMs
        const repairJson = (jsonStr: string): string => {
            // 1. Remove markdown fences
            let cleaned = jsonStr.replace(/^```(?:json)?\s*|```\s*$/gi, '').trim()

            // 2. Escape newlines in bodyMarkdown/body field
            // Matches: "key": "CONTENT" -> looking ahead for next key or end of object
            cleaned = cleaned.replace(
                /("(?:body|bodyMarkdown)"\s*:\s*")([\s\S]*?)(",?\s*(?:"[^"]+"\s*:|\}))/g,
                (match, prefix, content, suffix) => {
                    const escaped = content
                        .replace(/\n/g, '\\n')
                        .replace(/\r/g, '\\r')
                        .replace(/\t/g, '\\t')
                    return `${prefix}${escaped}${suffix}`
                }
            )
            return cleaned
        }

        const cleanedResponse = repairJson(response)

        // Log the cleaned response for debugging
        console.log('Attempting to parse Groq JSON response (first 500 chars):', cleanedResponse.substring(0, 500))

        let parsed
        try {
            parsed = JSON.parse(cleanedResponse)
        } catch (error) {
            console.error('JSON Parse Failed:', error)
            // If repair failed, try one more aggressive pass just for bodyMarkdown
            // (Sometimes the suffix regex misses if structure is very broken)
            const simplerFixed = cleanedResponse.replace(
                /("(?:body|bodyMarkdown)"\s*:\s*")([\s\S]*)/,
                (match, prefix, rest) => {
                    // Try to find the last quote that looks like an end quote
                    // This is "unsafe" but better than failing
                    const escaped = rest
                        .replace(/\n/g, '\\n')
                        .replace(/\r/g, '\\r')
                        .replace(/\t/g, '\\t')
                    return `${prefix}${escaped}`
                }
            )
            try {
                parsed = JSON.parse(simplerFixed)
            } catch (finalError) {
                console.error('Final JSON repair attempt failed:', finalError)
            }
        }

        if (parsed) {
            return {
                title: parsed.title || topic,
                body: parsed.bodyMarkdown || parsed.body || '',
                excerpt: parsed.excerpt || '',
                metaDescription: parsed.metaDescription || '',
                focusKeyword: parsed.focusKeyword || topic,
                slug: parsed.slug || topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                modelUsed: DEFAULT_MODEL,
            }
        }

        throw new Error('Could not parse Groq response')

    } catch (error) {
        console.error('Failed to parse Groq response as JSON:', error)
        console.error('Raw response (first 1000 chars):', response.substring(0, 1000))

        // Fallback: Extract fields using Regex (Best Effort)
        // This avoids returning the raw JSON string as the body
        const extractField = (key: string) => {
            const match = response.match(new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)(?<!\\\\)"`))
            return match ? match[1] : null
        }

        const title = extractField('title') || topic
        const body = extractField('bodyMarkdown') || extractField('body') || response
        const excerpt = extractField('excerpt') || response.substring(0, 160)
        const slug = extractField('slug') || topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

        console.warn('Using Regex extraction fallback')
        return {
            title,
            body,
            excerpt,
            metaDescription: extractField('metaDescription') || '',
            focusKeyword: extractField('focusKeyword') || topic,
            slug,
            modelUsed: DEFAULT_MODEL
        }
    }
}
