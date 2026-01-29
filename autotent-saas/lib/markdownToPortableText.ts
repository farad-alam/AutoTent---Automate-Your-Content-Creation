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

                // Clean up link marks for INTERNAL links (starting with /)
                // The @portabletext/markdown library sometimes adds 'blank' and 'rel' fields
                // which are not defined in Sanity schema for internal links
                if (newItem.marks && Array.isArray(newItem.marks)) {
                    newItem.marks = newItem.marks.map((mark: any) => {
                        if (mark._type === 'link' && mark.href && mark.href.startsWith('/')) {
                            // This is an internal link - strip unsupported attributes
                            const { blank, rel, ...cleanMark } = mark;
                            return cleanMark;
                        }
                        return mark;
                    });
                }

                // Also check if this item itself has markDefs that need cleaning
                if (newItem.markDefs && Array.isArray(newItem.markDefs)) {
                    newItem.markDefs = newItem.markDefs.map((def: any) => {
                        if (def._type === 'link' && def.href && def.href.startsWith('/')) {
                            // This is an internal link - strip unsupported attributes
                            const { blank, rel, ...cleanDef } = def;
                            return cleanDef;
                        }
                        return def;
                    });
                }

                return newItem;
            });
    };

    return processBlocks(blocks);
}
