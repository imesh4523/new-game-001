// Test script to check DATABASE_URL
console.log('=== Environment Variable Test ===');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);
console.log('DATABASE_URL first 50 chars:', process.env.DATABASE_URL?.substring(0, 50) || 'NOT SET');
console.log('');
console.log('PGHOST:', process.env.PGHOST || 'NOT SET');
console.log('PGUSER:', process.env.PGUSER || 'NOT SET');
console.log('PGDATABASE:', process.env.PGDATABASE || 'NOT SET');
console.log('PGPORT:', process.env.PGPORT || 'NOT SET');
console.log('');
console.log('All env vars starting with PG or DATABASE:');
Object.keys(process.env)
  .filter(key => key.startsWith('PG') || key.includes('DATABASE'))
  .forEach(key => {
    const value = process.env[key];
    console.log(`  ${key}: ${value?.substring(0, 30)}...`);
  });
