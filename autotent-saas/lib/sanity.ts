import { createClient } from "@sanity/client";

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

    // Create the document
    // Note: Transforming Markdown to Portable Text properly requires a parser.
    // For simplicity MVP, we might push raw markdown or a simple block.
    // Ideally use @portabletext/to-portabletext-block

    const doc = {
        _type: "post",
        title: post.title,
        slug: {
            _type: "slug",
            current: post.slug,
        },
        // Simple body structure - Users will need a schema that accepts this or we need a converter
        body: [
            {
                _type: 'block',
                children: [
                    {
                        _type: 'span',
                        text: post.bodyMarkdown // This is raw markdown, ideally needs parsing
                    }
                ]
            }
        ],
        metadata: {
            description: post.metaDescription
        }
    };

    const result = await client.create(doc);
    return result;
}
