import { convertMarkdownToPortableText } from '../lib/markdownToPortableText';

const markdown = `
# Hello World
Here is an image:
![Test Image](https://images.unsplash.com/photo-123?w=1200)
End of text.
`;

const result = convertMarkdownToPortableText(markdown);
console.log(JSON.stringify(result, null, 2));
