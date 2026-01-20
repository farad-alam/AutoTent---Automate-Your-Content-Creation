export interface YouTubeVideo {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    videoUrl: string;
}

export async function searchYouTubeVideo(query: string): Promise<YouTubeVideo | null> {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
        console.warn('YOUTUBE_API_KEY is not set');
        return null;
    }

    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${apiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`YouTube API Error: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
            const item = data.items[0];
            return {
                id: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnailUrl: item.snippet.thumbnails.high.url, // High quality thumbnail
                videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`
            };
        }

        return null; // No videos found
    } catch (error) {
        console.error('Failed to search YouTube:', error);
        return null;
    }
}
