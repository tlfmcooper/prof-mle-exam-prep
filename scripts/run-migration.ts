import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease add these to your .env file');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(migrationFile: string) {
  console.log(`\n📄 Running migration: ${path.basename(migrationFile)}`);
  
  try {
    // Read the migration file
    const sql = fs.readFileSync(migrationFile, 'utf-8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If exec_sql doesn't exist, try direct execution
      // This uses Supabase's SQL editor endpoint
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });

      if (!response.ok) {
        throw new Error(`Failed to execute migration: ${response.statusText}`);
      }
      
      console.log('✅ Migration completed successfully');
      return;
    }
    
    console.log('✅ Migration completed successfully');
    if (data) {
      console.log('   Result:', data);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting database migration...\n');
  console.log('📍 Target: study_plans table restructure');
  
  const migrationPath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20250118000000_recreate_study_plans.sql'
  );
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }
  
  try {
    await runMigration(migrationPath);
    console.log('\n✨ All migrations completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart your development server (npm run dev)');
    console.log('   2. Sign in to the application');
    console.log('   3. Test the Study Plan Generator in the Analytics page');
  } catch (error) {
    console.error('\n💥 Migration failed. Please check the error above.');
    console.error('\n🔧 Alternative: Run the SQL manually in Supabase SQL Editor:');
    console.error(`   File: ${migrationPath}`);
    process.exit(1);
  }
}

main();
