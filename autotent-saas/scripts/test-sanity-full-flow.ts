import { searchImage } from '../lib/unsplash';
import { uploadImageToSanity, publishToSanity } from '../lib/sanity';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testFullFlow() {
    console.log("🚀 Starting Full Sanity Flow Test...");

    // 1. Test Unsplash
    console.log("\n1️⃣ Testing Unsplash Search...");
    const searchTerm = "mountain landscape";
    const imageUrl = await searchImage(searchTerm);

    if (!imageUrl) {
        console.error("❌ Unsplash search failed. Check UNSPLASH_ACCESS_KEY.");
        return;
    }
    console.log(`✅ Found image URL: ${imageUrl}`);

    // Config
    const config = {
        projectId: "qbrwbhyz", // From .env.local logs
        dataset: "production",
        token: process.env.Sanity_API || ""
    };

    if (!config.token) {
        console.error("❌ Sanity API Token (Sanity_API) missing in .env.local");
        return;
    }

    // 2. Test Image Upload (Main Image)
    console.log("\n2️⃣ Testing Main Image Upload to Sanity...");
    const mainImageId = await uploadImageToSanity(config, imageUrl);
    if (!mainImageId) {
        console.error("❌ Main image upload failed.");
        return;
    }
    console.log(`✅ Main Image Uploaded! Asset ID: ${mainImageId}`);

    // 3. Test Inline Image Processing in Post
    console.log("\n3️⃣ Testing Inline Image Processing & Publishing...");

    // We'll use the SAME image URL for the inline test to save time/requests
    const markdownBody = `
# Test Article

This is a paragraph.

![Inline Mountain](${imageUrl})

Another paragraph.
    `;

    const post = {
        title: "Test Article with Images " + Date.now(),
        slug: "test-article-" + Date.now(),
        bodyMarkdown: markdownBody,
        metaDescription: "Testing image uploads",
        mainImageId: mainImageId
    };

    try {
        const result = await publishToSanity(config, post);
        console.log("✅ Post Published successfully!");
        console.log("Result ID:", result._id);

        // Inspect body to see if image block has asset reference
        console.log("\n4️⃣ Inspecting Created Document Body...");
        const bodyBlock = result.body.find((b: any) => b._type === 'image');
        if (bodyBlock && bodyBlock.asset && bodyBlock.asset._ref) {
            console.log("✅ Inline image has correct asset reference:", bodyBlock.asset._ref);
        } else {
            console.error("❌ Inline image MISSING asset reference!");
            console.log("Actual body block:", JSON.stringify(bodyBlock, null, 2));
        }

    } catch (error: any) {
        console.error("❌ Publishing failed:", error.message);
    }
}

testFullFlow();
