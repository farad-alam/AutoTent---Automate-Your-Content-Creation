const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
    console.error('❌ GOOGLE_GEMINI_API_KEY not found in .env.local');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        console.log('Fetching available Gemini models...\n');

        // List all models
        const models = await genAI.listModels();

        console.log('✅ Available Models:\n');

        models.forEach((model, index) => {
            console.log(`${index + 1}. Model: ${model.name}`);
            console.log(`   Display Name: ${model.displayName}`);
            console.log(`   Description: ${model.description}`);
            console.log(`   Supported Methods: ${model.supportedGenerationMethods.join(', ')}`);
            console.log('');
        });

        console.log('\n✅ Total models available:', models.length);

        // Find models that support generateContent
        const contentGenModels = models.filter(m =>
            m.supportedGenerationMethods.includes('generateContent')
        );

        console.log('\n📝 Models supporting generateContent:');
        contentGenModels.forEach(m => {
            console.log(`   - ${m.name}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

listModels();
