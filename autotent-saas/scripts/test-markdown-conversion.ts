import { convertMarkdownToPortableText } from "../lib/markdownToPortableText";

const sampleMarkdown = `
## Introduction
Hello **world**.

- Item 1
- Item 2

![Alt text](https://example.com/image.jpg)
`;

try {
    const result = convertMarkdownToPortableText(sampleMarkdown);
    console.log(JSON.stringify(result, null, 2));
} catch (error) {
    console.error("Error converting markdown:", error);
}
