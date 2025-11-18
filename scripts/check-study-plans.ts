import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStudyPlans() {
  console.log('🔍 Checking study_plans table...\n');
  
  // Try to query all study plans (this will fail if RLS is blocking)
  const { data, error } = await supabase
    .from('study_plans')
    .select('*');
  
  if (error) {
    console.error('❌ Error querying study_plans:', error);
    console.log('\n💡 RLS policies are preventing unauthenticated access (this is correct!)');
    console.log('   To check the data, run this SQL in Supabase SQL Editor:');
    console.log('   SELECT id, user_id, exam_date, hours_per_week, created_at FROM study_plans;');
  } else {
    console.log('✅ Found', data?.length || 0, 'study plan(s)');
    if (data && data.length > 0) {
      console.log('\n📋 Study Plans:');
      data.forEach((plan, index) => {
        console.log(`\n${index + 1}.`, {
          id: plan.id,
          user_id: plan.user_id,
          exam_date: plan.exam_date,
          hours_per_week: plan.hours_per_week,
          created_at: plan.created_at,
          updated_at: plan.updated_at,
        });
      });
    } else {
      console.log('\n💡 No plans found (either table is empty or RLS is blocking access)');
      console.log('   To verify, check in Supabase Dashboard → Table Editor → study_plans');
    }
  }
}

checkStudyPlans();
