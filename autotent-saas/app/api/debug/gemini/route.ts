import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function GET() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: "No API Key found" }, { status: 500 });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // There isn't a direct "listModels" on the instance in some versions, 
        // but we can try to use the model manager if available or just hit the REST endpoint if SDK fails.
        // Let's try the simple REST fetch first to be absolutely sure what the API sees, 
        // effectively bypassing SDK version quirks.

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        return NextResponse.json({
            source: "REST API v1beta",
            models: data
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
