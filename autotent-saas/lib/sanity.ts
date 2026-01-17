import { createClient } from "@sanity/client";
import { convertMarkdownToPortableText } from "./markdownToPortableText";

interface SanityConfig {
    projectId: string;
    dataset: string;
    token: string;
}

interface BlogPost {
    title: string;
    slug: string;
    bodyMarkdown: string;
    metaDescription: string;
    excerpt?: string;
    authorId?: string; // Sanity Author ID
    categoryId?: string; // Sanity Category ID (assuming single category for now, or array)
}

export function createSanityClient(config: SanityConfig) {
    return createClient({
        projectId: config.projectId,
        dataset: config.dataset,
        token: config.token,
        useCdn: false,
        apiVersion: "2024-01-01",
    });
}

export async function publishToSanity(config: SanityConfig, post: BlogPost) {
    const client = createSanityClient(config);

    const doc: any = {
        _type: "post",
        title: post.title,
        slug: {
            _type: "slug",
            current: post.slug,
        },
        // Use the utility to convert markdown to Portable Text
        body: convertMarkdownToPortableText(post.bodyMarkdown),
        excerpt: post.excerpt,
        metadata: {
            description: post.metaDescription
        }
    };

    // Add Author if provided
    if (post.authorId) {
        doc.author = {
            _type: 'reference',
            _ref: post.authorId
        };
    }

    // Add Category if provided (Sanity usually uses categories array)
    if (post.categoryId) {
        doc.categories = [
            {
                _type: 'reference',
                _key: crypto.randomUUID(),
                _ref: post.categoryId
            }
        ];
    }

    const result = await client.create(doc);
    return result;
}
