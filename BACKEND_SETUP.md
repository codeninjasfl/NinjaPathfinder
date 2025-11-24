# Backend Setup Instructions

This document explains how to set up the backend API proxy for the Code Ninjas Pathfinder application.

## Overview

The Gemini API key is now stored securely on the backend instead of being exposed in the client-side code. The frontend makes requests to `/api/gemini-proxy`, which then calls the Gemini API with the secure key.

---

## Quick Start (Vercel Deployment - Recommended)

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Install Dependencies

```bash
cd /Users/bshea/Path
npm install
```

### 3. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:

```
GEMINI_API_KEY=AIzaSyCyqSbjl5V5CgeBVuUePML09cySGGNHS5U
```

### 4. Test Locally

```bash
vercel dev
```

This will start a local development server at `http://localhost:3000`. Open your browser and test the application.

### 5. Deploy to Production

```bash
vercel --prod
```

Follow the prompts to deploy. Vercel will ask you to:
- Link to an existing project or create a new one
- Set environment variables (add `GEMINI_API_KEY`)

**Important**: After deployment, add the environment variable in the Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add `GEMINI_API_KEY` with your actual key
4. Redeploy the project

---

## Alternative: Database Storage (Advanced)

If you prefer to store the API key in a database instead of environment variables:

### Option 1: Supabase (Recommended for Database Storage)

#### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and API key

#### 2. Create API Keys Table

Run this SQL in the Supabase SQL Editor:

```sql
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  service_name VARCHAR(50) UNIQUE NOT NULL,
  api_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert your Gemini API key
INSERT INTO api_keys (service_name, api_key) 
VALUES ('gemini', 'AIzaSyCyqSbjl5V5CgeBVuUePML09cySGGNHS5U');

-- Create a function to get the API key (optional, for security)
CREATE OR REPLACE FUNCTION get_api_key(service TEXT)
RETURNS TEXT AS $$
  SELECT api_key FROM api_keys WHERE service_name = service LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;
```

#### 3. Update Backend Code

Modify `api/gemini-proxy.js` to fetch the key from Supabase:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Fetch API key from database
  const { data, error } = await supabase
    .from('api_keys')
    .select('api_key')
    .eq('service_name', 'gemini')
    .single();

  if (error || !data) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve API key' });
  }

  const GEMINI_API_KEY = data.api_key;
  
  // ... rest of the code remains the same
}
```

#### 4. Add Supabase Environment Variables

In `.env`:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

#### 5. Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### Option 2: PostgreSQL/MySQL

If you have your own database server:

#### 1. Create Database and Table

```sql
CREATE DATABASE code_ninjas_pathfinder;

USE code_ninjas_pathfinder;

CREATE TABLE api_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_name VARCHAR(50) UNIQUE NOT NULL,
  api_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO api_keys (service_name, api_key) 
VALUES ('gemini', 'AIzaSyCyqSbjl5V5CgeBVuUePML09cySGGNHS5U');
```

#### 2. Update Backend Code

Install database client:

```bash
npm install mysql2
# or for PostgreSQL:
npm install pg
```

Modify `api/gemini-proxy.js`:

```javascript
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

export default async function handler(req, res) {
  // Fetch API key from database
  const [rows] = await pool.query(
    'SELECT api_key FROM api_keys WHERE service_name = ?',
    ['gemini']
  );

  if (!rows || rows.length === 0) {
    return res.status(500).json({ success: false, error: 'API key not found' });
  }

  const GEMINI_API_KEY = rows[0].api_key;
  
  // ... rest of the code remains the same
}
```

---

## Security Best Practices

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use environment variables in production** - Set them in your hosting platform
3. **Rotate API keys regularly** - Update the key in your database/environment
4. **Enable CORS restrictions** - Only allow requests from your domain
5. **Add rate limiting** - Prevent abuse of your API endpoint
6. **Monitor usage** - Track API calls to detect unusual activity

---

## Troubleshooting

### Error: "Backend API URL is not configured"

- Check that `BACKEND_API_URL` in `index.html` is set correctly
- For local development: `/api/gemini-proxy`
- For production: Update to your deployed URL if different

### Error: "GEMINI_API_KEY environment variable is not set"

- Ensure `.env` file exists with the correct key
- For Vercel: Add the environment variable in project settings
- Restart your development server after adding the key

### Error: "All Gemini models failed to respond"

- Verify your API key is valid
- Check your Google Cloud billing is enabled
- Ensure you have API quota remaining

### CORS Errors

If you see CORS errors in the browser console, add CORS headers to `api/gemini-proxy.js`:

```javascript
// Add at the top of the handler function
res.setHeader('Access-Control-Allow-Origin', '*'); // Or specify your domain
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

if (req.method === 'OPTIONS') {
  return res.status(200).end();
}
```

---

## Testing the Backend

### Test with cURL

```bash
curl -X POST http://localhost:3000/api/gemini-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Say hello in a friendly way",
    "models": ["gemini-2.5-flash"]
  }'
```

Expected response:

```json
{
  "success": true,
  "text": "Hello! How can I help you today?",
  "model": "gemini-2.5-flash"
}
```

### Test in Browser

1. Open the application in your browser
2. Complete the questionnaire
3. Check the browser console (F12) for any errors
4. Verify that the AI-generated email appears correctly

---

## Next Steps

1. **Deploy to production** using Vercel or your preferred hosting platform
2. **Update `BACKEND_API_URL`** in `index.html` if deploying to a custom domain
3. **Set up monitoring** to track API usage and errors
4. **Configure rate limiting** to prevent abuse
5. **Enable analytics** to understand usage patterns
