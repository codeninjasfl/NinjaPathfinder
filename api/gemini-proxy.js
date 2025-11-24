// Backend API Proxy for Gemini API (Supabase Version)
// This endpoint securely retrieves the API key from Supabase and calls Gemini

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

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
        console.log("Checking environment variables...");
        if (!process.env.SUPABASE_URL) console.error("Missing SUPABASE_URL");
        if (!process.env.SUPABASE_SERVICE_KEY) console.error("Missing SUPABASE_SERVICE_KEY");

        // Fetch API key from Supabase
        console.log("Connecting to Supabase...");
        const { data, error } = await supabase
            .from('api_keys')
            .select('api_key')
            .eq('service_name', 'gemini')
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ success: false, error: 'Database error: ' + error.message });
        }

        if (!data) {
            console.error('No data returned from Supabase for service_name=gemini');
            return res.status(500).json({ success: false, error: 'API key not found in database' });
        }

        console.log("API Key retrieved successfully");
        const GEMINI_API_KEY = data.api_key;

        const { prompt, models } = req.body;

        // Validate request body
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid prompt' });
        }

        const modelCandidates = models || [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-flash-latest"
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
