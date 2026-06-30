import { createClient } from '@supabase/supabase-js';

// সুপাবেস প্রজেক্টের URL এবং Publishable (anon) Key
const supabaseUrl = 'https://ttqkfumqwvkbiuaszwra.supabase.co'; // এখানে আপনার আসল URL বসান
const supabaseAnonKey = 'sb_publishable_oA033hMNLc97jfinWvLgAA_aXNM_DMT'; // এখানে আপনার Publishable Key বসান

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
