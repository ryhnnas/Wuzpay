import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://hwakdwxqnipnpregegws.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3YWtkd3hxbmlwbnByZWdlZ3dzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTEwOTYxOSwiZXhwIjoyMDg0Njg1NjE5fQ.eZ2gQXDEuq92XXncUoCmRGWAT4GPi34VcZfoBds2Doo";

// Gunakan fungsi untuk mendapatkan client agar instance selalu fresh di setiap request
export const getSupabase = () => {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false, // Penting untuk server-side agar tidak nyangkut sesi lama
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
};

// Untuk kompatibilitas kode lama kamu yang pakai import { supabase }
export const supabase = getSupabase();