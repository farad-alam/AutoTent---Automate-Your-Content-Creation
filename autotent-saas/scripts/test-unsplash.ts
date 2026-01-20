import { searchImage } from '../lib/unsplash';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function test() {
    console.log("Testing Unsplash Integration...");
    const term = "futuristic office";
    console.log(`Searching for: "${term}"`);

    const url = await searchImage(term);

    if (url) {
        console.log("SUCCESS! Found image URL:");
        console.log(url);
    } else {
        console.error("FAILED. No image found or API error.");
    }
}

test();
