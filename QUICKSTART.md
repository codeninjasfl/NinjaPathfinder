# 🚀 Quick Start Guide - Supabase Setup Complete

Your Supabase configuration is ready! Follow these steps to get your backend running.

## ✅ Configuration Summary

- **Supabase URL**: `https://nuvyqrynulydevguxhfg.supabase.co`
- **Service Key**: Configured ✓
- **Gemini API Key**: `AIzaSyCVkmjIQm2qrFMP2h7SUkijM76WOEBkMBs` (stored in database)

---

## 📋 Step 1: Run SQL in Supabase (If Not Done Already)

1. Go to https://nuvyqrynulydevguxhfg.supabase.co
2. Click **SQL Editor** in the left sidebar
3. Open the file `supabase-setup.sql` in this directory
4. Copy the entire SQL script and paste it into the SQL Editor
5. Click **Run** to execute

This will:
- Create the `api_keys` table
- Insert your Gemini API key
- Create a secure function to retrieve the key

---

## 📋 Step 2: Create Your .env File

**Option A - Copy from template:**
```bash
cd /Users/bshea/Path
cp env-template.txt .env
```

**Option B - Create manually:**
```bash
cd /Users/bshea/Path
nano .env
```

Then paste this content:
```
SUPABASE_URL=https://nuvyqrynulydevguxhfg.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51dnlxcnludWx5ZGV2Z3V4aGZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzc1NTQxMCwiZXhwIjoyMDc5MzMxNDEwfQ.qtIF7vg9obZEG_qQvvVLCMmnfWQbbLa4dHGxS8lyu_Y
```

---

## 📋 Step 3: Install Dependencies

```bash
cd /Users/bshea/Path
npm install
```

This will install:
- `@supabase/supabase-js` - Supabase client
- `dotenv` - Environment variable loader
- `vercel` - Deployment tool

---

## 📋 Step 4: Test Locally

```bash
vercel dev
```

This will start a local server at `http://localhost:3000`

**Test the application:**
1. Open http://localhost:3000 in your browser
2. Complete the questionnaire
3. Check that the AI-generated email appears
4. Open browser console (F12) to check for errors

---

## 📋 Step 5: Deploy to Production

```bash
vercel --prod
```

**During deployment:**
1. Vercel will ask you to link to a project (create new or use existing)
2. After deployment, go to your Vercel project dashboard
3. Navigate to **Settings** → **Environment Variables**
4. Add these variables:
   - `SUPABASE_URL` = `https://nuvyqrynulydevguxhfg.supabase.co`
   - `SUPABASE_SERVICE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your full key)
5. Redeploy the project

---

## 🔍 Verify Everything is Working

### Check 1: Supabase Database
```sql
-- Run this in Supabase SQL Editor to verify the key is stored
SELECT service_name, LEFT(api_key, 20) || '...' as api_key_preview 
FROM api_keys 
WHERE service_name = 'gemini';
```

Expected result: Should show `gemini` with a preview of your API key

### Check 2: Local Backend Test
```bash
# Test the backend endpoint directly
curl -X POST http://localhost:3000/api/gemini-proxy \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Say hello", "models": ["gemini-2.5-flash"]}'
```

Expected result: Should return JSON with `{"success": true, "text": "Hello!...", "model": "..."}`

### Check 3: Frontend Integration
1. Open the application in browser
2. Complete the questionnaire
3. Verify AI-generated email appears
4. Check browser DevTools → Network tab
5. Confirm requests go to `/api/gemini-proxy` (not directly to Google)

---

## 🎉 You're All Set!

Your backend is now configured with:
- ✅ Secure API key storage in Supabase
- ✅ Backend proxy endpoint
- ✅ Environment variables configured
- ✅ Ready for local development and production deployment

---

## 🆘 Troubleshooting

**Error: "Failed to retrieve API key from Supabase"**
- Verify you ran the SQL script in Supabase
- Check that the `api_keys` table exists
- Confirm the Gemini key is in the database

**Error: "SUPABASE_URL is not defined"**
- Ensure `.env` file exists in `/Users/bshea/Path/`
- Restart your development server after creating `.env`

**Error: "All Gemini models failed to respond"**
- Verify your Gemini API key is valid
- Check Google Cloud billing is enabled
- Ensure you have API quota remaining

**CORS Errors**
- Check that `BACKEND_API_URL` in `index.html` is set to `/api/gemini-proxy`
- For production, ensure your domain is allowed

---

## 📞 Next Steps

1. **Test locally** with `vercel dev`
2. **Deploy to production** with `vercel --prod`
3. **Monitor usage** in Supabase dashboard
4. **Set up analytics** to track API calls
5. **Configure rate limiting** if needed
