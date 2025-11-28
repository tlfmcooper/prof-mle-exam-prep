
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

async function cleanupSessions() {
  console.log('Fetching sessions...');
  const { data: sessions, error } = await supabase
    .from('study_sessions')
    .select('*');

  if (error) {
    console.error('Error fetching sessions:', error);
    return;
  }

  console.log(`Found ${sessions.length} sessions.`);

  const sessionsToDelete = sessions.filter(s => s.score_percentage === 0 || s.correct_answers === 0);
  
  if (sessionsToDelete.length === 0) {
    console.log('No sessions to delete.');
    return;
  }

  console.log(`Deleting ${sessionsToDelete.length} sessions with 0 score...`);

  for (const session of sessionsToDelete) {
    // We might need to delete related session_attempts first if cascade delete isn't set up
    // But let's try deleting the session first.
    const { error: deleteError } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', session.id);

    if (deleteError) {
      console.error(`Failed to delete session ${session.id}:`, deleteError);
    } else {
      console.log(`Deleted session ${session.id}`);
    }
  }

  console.log('Cleanup complete.');
}

cleanupSessions();
