console.log('=== Database Environment Variables ===\n');

const vars = ['DATABASE_URL', 'PGHOST', 'PGUSER', 'PGDATABASE', 'PGPORT', 'PGPASSWORD'];

vars.forEach(v => {
  const val = process.env[v];
  if (v === 'PGPASSWORD') {
    console.log(`${v}: ${val ? '***' + val.length + ' chars***' : 'EMPTY'}`);
  } else if (v === 'DATABASE_URL') {
    console.log(`${v}: ${val ? val.substring(0, 80) + '...' : 'EMPTY'}`);
  } else {
    console.log(`${v}: ${val || 'EMPTY'}`);
  }
});

console.log('\n=== Summary ===');
console.log('Values set:', vars.filter(v => process.env[v] && process.env[v].length > 0).length, '/', vars.length);
