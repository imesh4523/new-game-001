import "dotenv/config";
import { pool } from "./server/db";

async function listAll() {
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
    
    if (res.rows.length === 0) {
      console.log("❌ No tables found in any schema (excluding system schemas).");
    } else {
      console.log(`✅ Found ${res.rows.length} tables:`);
      res.rows.forEach((row: any) => {
        console.log(`- [${row.table_schema}] ${row.table_name}`);
      });
    }

    const schemas = await pool.query("SELECT schema_name FROM information_schema.schemata");
    console.log("\n✅ All available schemas:");
    schemas.rows.forEach((row: any) => {
      console.log(`- ${row.schema_name}`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

listAll();
