const https = require('https');
const path = require('path');
const fs = require('fs');

// Simple .env parser since we can't depend on dotenv working in this restricted env
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const [key, ...values] = line.split('=');
            if (key && values.length > 0) {
                process.env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
            }
        });
    } catch (e) {
        console.warn("Could not read .env.local");
    }
}

loadEnv();

async function searchImage(query) {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
        console.warn("Missing UNSPLASH_ACCESS_KEY");
        return null;
    }

    return new Promise((resolve, reject) => {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
        const options = {
            headers: {
                Authorization: `Client-ID ${accessKey}`
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    console.error(`Status: ${res.statusCode}`);
                    resolve(null);
                    return;
                }
                const json = JSON.parse(data);
                if (json.results && json.results.length > 0) {
                    const rawUrl = json.results[0].urls.raw;
                    resolve(`${rawUrl}?w=1200&h=630&fit=crop&q=80&fm=webp`);
                } else {
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            console.error(err);
            resolve(null);
        });
    });
}

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
