
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugQuery() {
  // First get a valid session ID
  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('id')
    .limit(1);

  if (!sessions || sessions.length === 0) {
    console.log('No sessions found to test with.');
    return;
  }

  const sessionId = sessions[0].id;
  console.log(`Testing query with session ID: ${sessionId}`);

  // Test the full failing query
  console.log('Testing full query...');
  const { data, error } = await supabase
    .from('study_sessions')
    .select(`
      *,
      session_attempts!inner (
        attempt:user_attempts (
          *,
          question:questions (*)
        )
      )
    `)
    .eq('id', sessionId)
    .single();

  if (error) {
    console.error('Full query failed:', error);
  } else {
    console.log('Full query succeeded!');
  }

  // Test simplified query 1: Just session_attempts
  console.log('\nTesting simplified query 1 (session_attempts)...');
  const { error: error1 } = await supabase
    .from('study_sessions')
    .select(`
      *,
      session_attempts!inner (*)
    `)
    .eq('id', sessionId)
    .single();
  
  if (error1) console.error('Query 1 failed:', error1);
  else console.log('Query 1 succeeded');

  // Test simplified query 2: session_attempts -> user_attempts
  console.log('\nTesting simplified query 2 (session_attempts -> user_attempts)...');
  const { error: error2 } = await supabase
    .from('study_sessions')
    .select(`
      *,
      session_attempts!inner (
        attempt:user_attempts (*)
      )
    `)
    .eq('id', sessionId)
    .single();

  if (error2) console.error('Query 2 failed:', error2);
  else console.log('Query 2 succeeded');
}

debugQuery();
