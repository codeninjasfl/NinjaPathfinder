// Backend API Proxy for Gemini API (Environment Variable Version)
// This endpoint reads the API key from environment variables and calls Gemini

// Use Node.js runtime for better stability with longer timeouts
export const config = {
    runtime: 'nodejs',
};

export default async function handler(req, res) {
    console.log("API Handler started");

    // CORS headers for response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_FALLBACK;

        if (!apiKey) {
            console.error("GEMINI_API_KEY is missing");
            res.status(500).json({ success: false, error: 'Server configuration error: API key missing.' });
            return;
        }

        // Parse request body
        const { prompt, models } = req.body;

        if (!prompt || typeof prompt !== 'string') {
            res.status(400).json({ success: false, error: 'Invalid prompt' });
            return;
        }

        // Optimized model sequence: fastest models first to avoid timeouts
        const modelCandidates = models || [
            "gemini-3.1-flash-lite-preview",
            "gemini-flash-latest",
            "gemini-flash-lite-latest"
        ];

        // Try each model in sequence until one succeeds
        for (const model of modelCandidates) {
            try {
                console.log(`Attempting model: ${model}`);
                const geminiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            contents: [
                                {
                                    role: "user",
                                    parts: [{ text: prompt }]
                                }
                            ]
                        })
                    }
                );

                if (!geminiResponse.ok) {
                    const errorText = await geminiResponse.text();
                    console.warn(`Model ${model} failed with status ${geminiResponse.status}: ${errorText}`);
                    continue; // Try next model
                }

                const data = await geminiResponse.json();
                const parts = data?.candidates?.[0]?.content?.parts || [];
                const text = parts.map(p => p.text || "").join("").trim();

                if (text) {
                    console.log(`Success with ${model}!`);
                    res.status(200).json({
                        success: true,
                        text: text,
                        model: model
                    });
                    return;
                }
            } catch (modelError) {
                console.warn(`Error with model ${model}:`, modelError.message);
                continue; // Try next model
            }
        }

        // If all models failed
        console.error("All models failed");
        res.status(503).json({
            success: false,
            error: 'All Gemini models failed to respond'
        });

    } catch (error) {
        console.error('Gemini proxy error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error: ' + error.message
        });
    }
}
