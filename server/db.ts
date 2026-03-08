import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DO_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || (process.env.PGHOST?.trim()
  ? `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE}`
  : '');

const isValidDatabaseUrl = DATABASE_URL && 
  DATABASE_URL !== 'postgresql://:::5432/' && 
  !DATABASE_URL.includes('undefined') &&
  DATABASE_URL.length > 20;

if (!isValidDatabaseUrl) {
  console.log('DATABASE_URL not found - using in-memory storage');
  console.log('Note: Data will not persist between server restarts');
  console.log('Using in-memory storage (for development/testing)');
}

// Check if it's a Neon database or other PostgreSQL (like Digital Ocean)
const isNeonDatabase = DATABASE_URL.includes('neon.tech');

let pool: any = null;
let db: any = null;

if (isValidDatabaseUrl) {
  try {
    if (isNeonDatabase) {
      // Use Neon serverless for Neon databases
      pool = new NeonPool({ connectionString: DATABASE_URL });
      db = drizzleNeon({ client: pool, schema });
      console.log("✅ Database connection established using Neon PostgreSQL");
    } else {
      // Use regular pg for other PostgreSQL databases (Digital Ocean, etc.)
      // Parse connection string and rebuild with proper SSL config
      try {
        const urlObj = new URL(DATABASE_URL);
        const sslRequired = urlObj.searchParams.get('sslmode') === 'require';
        
        // Remove sslmode from connection string as we'll handle SSL separately
        urlObj.searchParams.delete('sslmode');
        const cleanUrl = urlObj.toString();
        
        pool = new PgPool({ 
          connectionString: cleanUrl,
          ssl: sslRequired ? { 
            rejectUnauthorized: false,
            ca: undefined
          } : false,
          connectionTimeoutMillis: 30000,
          idleTimeoutMillis: 30000,
          max: 20,
          min: 1,
          statement_timeout: 30000,
          query_timeout: 30000,
          allowExitOnIdle: true
        });
        db = drizzlePg(pool, { schema });
        console.log("✅ Database connection established using PostgreSQL (Digital Ocean)");
      } catch (urlError: any) {
        console.error('❌ Invalid DATABASE_URL format:', urlError.message);
        console.error('   Expected format: postgresql://user:pass@host:port/dbname?sslmode=require');
        console.error('   Check that the URL starts with "postgresql://" and has no quotes or whitespace');
        console.error('   Falling back to in-memory storage');
        pool = null;
        db = null;
      }
    }
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    console.error('   Falling back to in-memory storage');
    pool = null;
    db = null;
  }
}

export { pool, db };
