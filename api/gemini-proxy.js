// Backend API Proxy for Gemini API (Environment Variable Version)
// This endpoint reads the API key from environment variables and calls Gemini

// Use Vercel Edge Runtime for native fetch support
export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    console.log("API Handler started");
    console.log("Environment check - GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: corsHeaders,
        });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ success: false, error: 'Method not allowed' }),
            {
                status: 405,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }

    try {
        // Get API key from environment variable (Primary)
        let apiKey = process.env.GEMINI_API_KEY;
        let usingFallback = false;

        // Fallback Logic
        if (!apiKey) {
            console.warn("Primary GEMINI_API_KEY missing, trying fallback...");
            apiKey = process.env.GEMINI_API_KEY_FALLBACK;
            usingFallback = true;
        }

        if (!apiKey) {
            console.error("Both Primary and Fallback GEMINI_API_KEY are missing");
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Server configuration error: API keys missing.'
                }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        console.log(`Using ${usingFallback ? 'FALLBACK' : 'PRIMARY'} API Key`);

        // Parse request body
        const body = await req.json();
        const { prompt, models } = body;

        // Validate request body
        if (!prompt || typeof prompt !== 'string') {
            return new Response(
                JSON.stringify({ success: false, error: 'Invalid prompt' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        // Use gemini-3-flash-preview as the primary model (Google AI Studio new release)
        const modelCandidates = models || [
            "gemini-3-flash-preview",
            "gemini-flash-lite-latest",
            "gemini-2.0-flash-lite"
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
                    return new Response(
                        JSON.stringify({
                            success: true,
                            text: text,
                            model: model // Include which model was used
                        }),
                        {
                            status: 200,
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        }
                    );
                }
            } catch (modelError) {
                console.warn(`Error with model ${model}:`, modelError.message);
                continue; // Try next model
            }
        }

        // If all models failed
        console.error("All models failed");
        return new Response(
            JSON.stringify({
                success: false,
                error: 'All Gemini models failed to respond'
            }),
            {
                status: 503,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );

    } catch (error) {
        console.error('Gemini proxy error (Catch Block):', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: 'Internal server error: ' + error.message
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
}
