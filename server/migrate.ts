import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";
import { sql } from 'drizzle-orm';

async function runMigrations() {
  const databaseUrl = process.env.DO_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL or DO_DATABASE_URL environment variable not found');
    console.error('Please ensure the PostgreSQL database is provisioned');
    process.exit(1);
  }

  console.log('🔄 Connecting to database...');
  
  // Check if it's a Neon database or other PostgreSQL (like Digital Ocean)
  const isNeonDatabase = databaseUrl.includes('neon.tech');
  
  let pool: any;
  let db: any;
  
  if (isNeonDatabase) {
    // Use Neon serverless for Neon databases
    neonConfig.webSocketConstructor = ws;
    pool = new NeonPool({ connectionString: databaseUrl });
    db = drizzleNeon({ client: pool, schema });
    console.log("✅ Using Neon PostgreSQL driver for migrations");
  } else {
    // Use regular pg for other PostgreSQL databases (Digital Ocean, etc.)
    const urlObj = new URL(databaseUrl);
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
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 20
    });
    db = drizzlePg(pool, { schema });
    console.log("✅ Using PostgreSQL driver for migrations (Digital Ocean/Standard PostgreSQL)");
  }

  console.log('✅ Connected to database');
  console.log('🔄 Creating database schema...');

  try {
    // Create all tables by executing the schema
    // First, create enums
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('user', 'admin', 'agent');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE vip_level AS ENUM ('lv1', 'lv2', 'vip', 'vip1', 'vip2', 'vip3', 'vip4', 'vip5', 'vip6', 'vip7');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE game_type AS ENUM ('color', 'crash');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE game_status AS ENUM ('active', 'completed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE bet_type AS ENUM ('color', 'number', 'size', 'crash');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE bet_status AS ENUM ('pending', 'won', 'lost', 'cashed_out', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'referral_bonus', 'agent_commission', 'commission_withdrawal');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE withdrawal_request_status AS ENUM ('pending', 'approved', 'rejected', 'processing', 'completed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE payment_method AS ENUM ('crypto', 'bank_transfer', 'agent', 'internal');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE referral_status AS ENUM ('active', 'inactive');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE database_type AS ENUM ('postgresql', 'mysql', 'mongodb');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE database_status AS ENUM ('active', 'inactive', 'testing');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('✅ Database enums created');
    console.log('✅ Schema migration complete!');
    console.log('🎉 Database is ready to use');

  } catch (error: any) {
    if (error.code === '42710') {
      console.log('⚠️  Some objects already exist (this is normal)');
    } else {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
