import { createClient } from '@supabase/supabase-js';

// Configuration for Supabase
// We use a fallback key to ensure the app doesn't crash on startup if env vars are missing.
// We split the long key string to prevent accidental newlines or formatting issues causing SyntaxErrors.

const FALLBACK_URL = 'https://xauzbcwitegnfycpamtp.supabase.co';
const FALLBACK_KEY_PART1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhdXpiY3dpdGVnbmZ5Y3BhbXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjE2OTYsImV4cCI6MjA4NjM5NzY5Nn0';
const FALLBACK_KEY_PART2 = '.bhkZvD9AOMwlTEN3PtADOP-LF61rSEGWoHO2tfWX8t8';

const supabaseUrl = process.env.SUPABASE_URL || FALLBACK_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || (FALLBACK_KEY_PART1 + FALLBACK_KEY_PART2);

export const supabase = createClient(supabaseUrl, supabaseKey);