// Check all possible database-related env vars
const vars = process.env;
const dbVars = Object.keys(vars)
  .filter(k => k.includes('DB') || k.includes('PG') || k.includes('DATABASE') || k.includes('POSTGRES'))
  .sort();

console.log('=== All Database-Related Environment Variables ===\n');
dbVars.forEach(key => {
  const val = vars[key];
  const preview = val 
    ? (key.includes('PASS') || key.includes('SECRET') 
        ? `***${val.length} chars***` 
        : val.substring(0, 80) + (val.length > 80 ? '...' : ''))
    : 'EMPTY';
  console.log(`${key}: ${preview}`);
});

console.log(`\nTotal DB vars found: ${dbVars.length}`);
