import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runDiagnosis() {
  try {
    // Get DATABASE_URL from Replit's environment
    const databaseUrl = process.env.DATABASE_URL || process.env.PGDATABASE 
      ? `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`
      : null;
    
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL not available');
      console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('PG') || k.includes('DATABASE')));
      process.exit(1);
    }
    
    console.log('✅ DATABASE_URL found');
    
    // Set environment and run tsx
    const env = {
      ...process.env,
      DATABASE_URL: databaseUrl
    };
    
    const { stdout, stderr } = await execAsync('tsx scripts/diagnose-migration.ts', { env });
    console.log(stdout);
    if (stderr) console.error(stderr);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

runDiagnosis();
