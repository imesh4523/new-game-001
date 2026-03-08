import "dotenv/config";
import { pool } from "./server/db";

async function listUsers() {
  if (!pool) {
    console.log("❌ Database pool not established.");
    process.exit(1);
  }

  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name ILIKE '%user%'
      ORDER BY table_name;
    `);
    
    console.log(`✅ Found ${res.rows.length} tables like 'user':`);
    res.rows.forEach((row: any) => {
      console.log(`- ${row.table_name}`);
    });

    const userCount = await pool.query("SELECT COUNT(*) FROM users");
    console.log(`\n✅ Total in 'users' table: ${userCount.rows[0].count}`);

    const allSchemaRes = await pool.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'users'
    `);
    console.log(`\n✅ 'users' tables in different schemas:`);
    allSchemaRes.rows.forEach((row: any) => {
      console.log(`- [${row.table_schema}] ${row.table_name}`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

listUsers();
