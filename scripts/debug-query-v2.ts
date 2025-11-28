
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
  console.log('Fetching a session ID...');
  const { data: sessions, error: sessionError } = await supabase
    .from('study_sessions')
    .select('id')
    .limit(1);

  if (sessionError) {
    console.error('Error fetching sessions:', sessionError);
    return;
  }

  if (!sessions || sessions.length === 0) {
    console.log('No sessions found. Cannot test query.');
    return;
  }

  const sessionId = sessions[0].id;
  console.log(`Testing with session ID: ${sessionId}`);

  // Test 1: Basic Session Fetch
  console.log('\nTest 1: Basic Session Fetch');
  const { error: err1 } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (err1) console.error('Test 1 Failed:', err1);
  else console.log('Test 1 Passed');

  // Test 2: Join with session_attempts
  console.log('\nTest 2: Join with session_attempts');
  const { error: err2 } = await supabase
    .from('study_sessions')
    .select(`
      *,
      session_attempts (*)
    `)
    .eq('id', sessionId)
    .single();

  if (err2) console.error('Test 2 Failed:', err2);
  else console.log('Test 2 Passed');

  // Test 3: Join with session_attempts -> user_attempts (aliased)
  console.log('\nTest 3: Join with session_attempts -> attempt:user_attempts');
  const { error: err3 } = await supabase
    .from('study_sessions')
    .select(`
      *,
      session_attempts (
        attempt:user_attempts (*)
      )
    `)
    .eq('id', sessionId)
    .single();

  if (err3) console.error('Test 3 Failed:', err3);
  else console.log('Test 3 Passed');

   // Test 4: Join with session_attempts -> user_attempts (no alias)
   console.log('\nTest 4: Join with session_attempts -> user_attempts (no alias)');
   const { error: err4 } = await supabase
     .from('study_sessions')
     .select(`
       *,
       session_attempts (
         user_attempts (*)
       )
     `)
     .eq('id', sessionId)
     .single();
 
   if (err4) console.error('Test 4 Failed:', err4);
   else console.log('Test 4 Passed');
}

debugQuery();
