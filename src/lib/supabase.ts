import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbarnnavdygrzlupfzgk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiYXJubmF2ZHlncnpsdXBmemdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1OTc2MjQsImV4cCI6MjEwMzE3MzYyNH0.cnXkhUmemAT-LiO5vIaacALN1NC1kbVFTef6xGMEMd8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
