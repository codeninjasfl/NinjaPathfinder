-- Code Ninjas Pathfinder - Supabase Setup
-- Run this SQL in your Supabase SQL Editor

-- 1. Create the api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  service_name VARCHAR(50) UNIQUE NOT NULL,
  api_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Insert your Gemini API key
INSERT INTO api_keys (service_name, api_key) 
VALUES ('gemini', 'AIzaSyCVkmjIQm2qrFMP2h7SUkijM76WOEBkMBs')
ON CONFLICT (service_name) 
DO UPDATE SET 
  api_key = EXCLUDED.api_key,
  updated_at = CURRENT_TIMESTAMP;

-- 3. Create a secure function to retrieve the API key
CREATE OR REPLACE FUNCTION get_api_key(service TEXT)
RETURNS TEXT AS $$
  SELECT api_key FROM api_keys WHERE service_name = service LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- 4. Verify the key was inserted correctly
SELECT service_name, 
       LEFT(api_key, 10) || '...' as api_key_preview,
       created_at 
FROM api_keys 
WHERE service_name = 'gemini';
