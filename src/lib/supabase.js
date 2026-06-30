import { createClient } from '@supabase/supabase-js';

// সুপাবেস প্রজেক্টের URL এবং Publishable (anon) Key
const supabaseUrl = 'YOUR_PROJECT_URL'; // এখানে আপনার আসল URL বসান
const supabaseAnonKey = 'YOUR_PUBLISHABLE_KEY'; // এখানে আপনার Publishable Key বসান

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
