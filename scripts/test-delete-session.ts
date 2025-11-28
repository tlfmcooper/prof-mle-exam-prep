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

async function testDelete() {
  // 1. Get a session to test with
  const { data: sessions, error: fetchError } = await supabase
    .from('study_sessions')
    .select('id, score_percentage, correct_answers')
    .limit(1);

  if (fetchError) {
    console.error('Error fetching sessions:', fetchError);
    return;
  }

  if (!sessions || sessions.length === 0) {
    console.log('No sessions found to test deletion.');
    return;
  }

  const sessionId = sessions[0].id;
  console.log(`Testing deletion of session: ${sessionId}`);
  console.log(`Session score: ${sessions[0].score_percentage}% (${sessions[0].correct_answers} correct)`);

  // 2. Try to delete session_attempts first
  console.log('\nStep 1: Deleting session_attempts...');
  const { error: saError } = await supabase
    .from('session_attempts')
    .delete()
    .eq('session_id', sessionId);

  if (saError) {
    console.error('Error deleting session_attempts:', saError);
    console.error('Details:', JSON.stringify(saError, null, 2));
    return;
  }

  console.log('Session_attempts deleted successfully');

  // 3. Try to delete the session
  console.log('\nStep 2: Deleting study_session...');
  const { error: sessionError } = await supabase
    .from('study_sessions')
    .delete()
    .eq('id', sessionId);

  if (sessionError) {
    console.error('Error deleting study_session:', sessionError);
    console.error('Details:', JSON.stringify(sessionError, null, 2));
    return;
  }

  console.log('✅ Session deleted successfully!');
}

testDelete();
