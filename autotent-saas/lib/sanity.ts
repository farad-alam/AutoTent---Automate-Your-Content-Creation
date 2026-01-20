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
    mainImageId?: string; // Sanity Image Asset ID
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

export async function uploadImageToSanity(config: SanityConfig, imageUrl: string) {
    const client = createSanityClient(config);
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Failed to download image: ${response.statusText}`);

        // Convert stream to buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const asset = await client.assets.upload('image', buffer, {
            filename: 'main-image.webp' // Assumption due to query params
        });

        return asset._id;
    } catch (error) {
        console.error('Failed to upload image to Sanity:', error);
        return null; // Don't fail the whole job if image fails
    }
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

    // Add Main Image if provided
    if (post.mainImageId) {
        doc.mainImage = {
            _type: 'image',
            asset: {
                _type: 'reference',
                _ref: post.mainImageId
            }
        };
    }

    // Add Author if provided

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
