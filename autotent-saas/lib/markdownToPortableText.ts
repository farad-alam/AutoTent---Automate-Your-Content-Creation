import { markdownToPortableText } from "@portabletext/markdown";
import { PortableTextBlock } from "@portabletext/types";

/**
 * Converts a standard Markdown string into a Sanity Portable Text array.
 * Ensures every block and span has a unique `_key` and filters out unsupported block types.
 *
 * @param markdownString - The raw markdown content.
 * @returns An array of Portable Text blocks ready for Sanity API.
 */
export function convertMarkdownToPortableText(markdownString: string): PortableTextBlock[] {
    // Convert markdown to basic blocks using the official library
    const blocks = markdownToPortableText(markdownString) as any[];

    // Helper to generate unique keys recursively and filter invalid types
    const processBlocks = (items: any[]): any[] => {
        if (!Array.isArray(items)) return [];

        return items
            .filter(item => item._type !== 'horizontal-rule') // Filter out unsupported types
            .map(item => {
                const newItem = { ...item };

                // Ensure key exists
                if (!newItem._key) {
                    newItem._key = crypto.randomUUID();
                }

                // Recursively process children if they exist
                if (newItem.children && Array.isArray(newItem.children)) {
                    newItem.children = processBlocks(newItem.children);
                }

                return newItem;
            });
    };

    return processBlocks(blocks);
}
