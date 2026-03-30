// Supabase Client Singleton
// Single instance to avoid multiple GoTrueClient warnings

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// Create singleton instance
export const supabaseClient = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
