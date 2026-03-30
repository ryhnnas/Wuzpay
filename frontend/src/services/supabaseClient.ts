import { createClient } from "@supabase/supabase-js";

// Ambil dari Dashboard Supabase > Settings > API
const supabaseUrl = 'https://hwakdwxqnipnpregegws.supabase.co';
const supabaseAnonKey = 'sb_publishable_9tzeiTH0cx719gzuKQNdKA_jVzFyKoK';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);