import "dotenv/config";
import { pool } from "./server/db";

async function listTables() {
  if (!pool) {
    console.log("❌ Database pool not established.");
    process.exit(1);
  }

  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log("✅ Tables in 'public' schema:");
    res.rows.forEach((row: any) => {
      console.log(`- ${row.table_name}`);
    });

    const countRes = await pool.query("SELECT COUNT(*) FROM users");
    console.log(`\n✅ Total users in 'users' table: ${countRes.rows[0].count}`);
  } catch (error) {
    console.error("❌ Error listing tables:", error);
  } finally {
    process.exit(0);
  }
}

listTables();
