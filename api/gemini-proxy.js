// Backend API Proxy for Gemini API (Environment Variable Version)
// This endpoint reads the API key from environment variables and calls Gemini

export default async function handler(req, res) {
    console.log("API Handler started");

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        // Get API key from environment variable
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            console.error("Missing GEMINI_API_KEY environment variable");
            return res.status(500).json({
                success: false,
                error: 'Missing GEMINI_API_KEY environment variable. Please set it in your .env file or Vercel dashboard.'
            });
        }

        console.log("GEMINI_API_KEY found");

        // DEBUG: Log request details
        console.log("Request Headers:", JSON.stringify(req.headers));
        console.log("Request Body Type:", typeof req.body);
        console.log("Request Body:", JSON.stringify(req.body).substring(0, 500)); // Log first 500 chars

        const { prompt, models } = req.body;

        // Validate request body
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid prompt' });
        }

        // Use gemini-flash-lite-latest as the primary model
        const modelCandidates = models || [
            "gemini-2.0-flash-lite",
            "gemini-flash-lite-latest"
        ];

        // Try each model in sequence until one succeeds
        for (const model of modelCandidates) {
            try {
                console.log(`Attempting model: ${model}`);
                const geminiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
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
                    console.warn(`Model ${model} failed with status ${geminiResponse.status}`);
                    const errorText = await geminiResponse.text();
                    console.warn(`Error details: ${errorText}`);
                    continue; // Try next model
                }

                const data = await geminiResponse.json();
                const parts = data?.candidates?.[0]?.content?.parts || [];
                const text = parts.map(p => p.text || "").join("").trim();

                if (text) {
                    console.log("Success! Returning text.");
                    return res.status(200).json({
                        success: true,
                        text: text,
                        model: model // Include which model was used
                    });
                }
            } catch (modelError) {
                console.warn(`Error with model ${model}:`, modelError.message);
                continue; // Try next model
            }
        }

        // If all models failed
        console.error("All models failed");
        return res.status(503).json({
            success: false,
            error: 'All Gemini models failed to respond'
        });

    } catch (error) {
        console.error('Gemini proxy error (Catch Block):', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error: ' + error.message
        });
    }
}
