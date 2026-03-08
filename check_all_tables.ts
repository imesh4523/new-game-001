import "dotenv/config";
import { pool } from "./server/db";

async function checkAll() {
  if (!pool) {
    console.log("❌ Database pool not established.");
    process.exit(1);
  }

  try {
    const res = await pool.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name;
    `);
    
    console.log(`✅ Found ${res.rows.length} tables:`);
    res.rows.forEach((row: any) => {
      console.log(`- [${row.table_schema}] ${row.table_name}`);
    });

    const userRes = await pool.query("SELECT COUNT(*) FROM users");
    console.log(`\n✅ Total users: ${userRes.rows[0].count}`);

    const allUsers = await pool.query("SELECT id, email FROM users LIMIT 10");
    console.log(`\n✅ First 10 users:`);
    allUsers.rows.forEach((u: any) => {
      console.log(`- ${u.id}: ${u.email}`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

checkAll();
