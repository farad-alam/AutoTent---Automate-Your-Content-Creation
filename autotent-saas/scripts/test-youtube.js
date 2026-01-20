const https = require('https');
const path = require('path');
const fs = require('fs');

// Simple .env parser
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

async function searchVideo(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        console.error("Missing YOUTUBE_API_KEY");
        return null;
    }

    return new Promise((resolve, reject) => {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${apiKey}`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    console.error(`Status: ${res.statusCode}`);
                    console.error(`Body: ${data}`);
                    resolve(null);
                    return;
                }
                const json = JSON.parse(data);
                if (json.items && json.items.length > 0) {
                    const item = json.items[0];
                    resolve({
                        title: item.snippet.title,
                        videoId: item.id.videoId,
                        thumbnail: item.snippet.thumbnails.default.url
                    });
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
    console.log("Testing YouTube Integration...");
    const term = "Next.js for beginners";
    console.log(`Searching for: "${term}"`);

    const video = await searchVideo(term);

    if (video) {
        console.log("SUCCESS! Found video:");
        console.log(`Title: ${video.title}`);
        console.log(`URL: https://www.youtube.com/watch?v=${video.videoId}`);
    } else {
        console.error("FAILED. No video found or API error.");
    }
}

test();
