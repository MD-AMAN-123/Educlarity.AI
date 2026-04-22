import { createClient } from '@supabase/supabase-js';

// Configuration for Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance;

try {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials missing. Check your Vercel Environment Variables.');
  }
  
  // Initialize with fallback to prevent blank page crash
  supabaseInstance = createClient(
    supabaseUrl || 'https://placeholder.supabase.co', 
    supabaseKey || 'placeholder-key'
  );
} catch (e) {
  console.error("Supabase Initialization Error:", e);
  // Create a dummy client to prevent imports from failing
  supabaseInstance = {
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) })
  } as any;
}

export const supabase = supabaseInstance;