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

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        let extension = 'jpg';
        if (contentType.includes('webp')) extension = 'webp';
        if (contentType.includes('png')) extension = 'png';
        if (contentType.includes('gif')) extension = 'gif';

        const asset = await client.assets.upload('image', buffer, {
            filename: `image-${Date.now()}.${extension}`,
            contentType: contentType
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

    // Helper to process inline images recursively
    async function processInlineImages(blocks: any[]): Promise<any[]> {
        if (!blocks || !Array.isArray(blocks)) return blocks;

        const processed = await Promise.all(blocks.map(async (block) => {
            // CASE 1: Image is a top-level block (rare in this converter, but possible)
            if (block._type === 'image' && block.src && !block.asset) {
                console.log(`Found inline image (top-level): ${block.src}`);
                try {
                    const assetId = await uploadImageToSanity(config, block.src);
                    if (assetId) {
                        return {
                            _type: 'image',
                            _key: block._key,
                            asset: {
                                _type: 'reference',
                                _ref: assetId
                            },
                            alt: block.alt || 'Article Image'
                        };
                    }
                } catch (e) {
                    console.error("Failed to process inline image:", e);
                }
            }

            // CASE 2: Image is inside 'children' (common for standard markdown paragraphs)
            if (block.children && Array.isArray(block.children)) {
                // We need to map children, but some might change type from span/image -> block?
                // Actually, portable text images inside children are problematic for some renderers.
                // Standard Sanity Image blocks should be top-level.
                // However, @portabletext/markdown puts them in children if they are part of a paragraph.

                // Let's process children
                const processedChildren = await Promise.all(block.children.map(async (child: any) => {
                    if (child._type === 'image' && child.src && !child.asset) {
                        console.log(`Found inline image (child): ${child.src}`);
                        try {
                            const assetId = await uploadImageToSanity(config, child.src);
                            if (assetId) {
                                return {
                                    _type: 'image',
                                    _key: child._key,
                                    asset: {
                                        _type: 'reference',
                                        _ref: assetId
                                    },
                                    alt: child.alt || 'Article Image'
                                };
                            }
                        } catch (e) {
                            console.error("Failed to process child inline image:", e);
                        }
                    }
                    return child;
                }));

                block.children = processedChildren;
            }

            return block;
        }));

        return processed;
    }

    // Process body for inline images
    if (doc.body) {
        console.log("Processing inline images in body...");
        doc.body = await processInlineImages(doc.body);

        // Process Links for SEO (Target Blank + Nofollow)
        doc.body.forEach((block: any) => {
            if (block.markDefs && Array.isArray(block.markDefs)) {
                block.markDefs.forEach((def: any) => {
                    if (def._type === 'link') {
                        def.blank = true; // Open in new tab
                        def.rel = "nofollow"; // SEO requirement
                    }
                });
            }
        });
    }

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
