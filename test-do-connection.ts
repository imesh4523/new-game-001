import { Pool } from '@neondatabase/serverless';
import ws from "ws";
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://username:password@host:port/dbname?sslmode=require";

async function testConnection() {
  console.log('🔍 Testing Digital Ocean database connection...');
  console.log('📊 URL:', DATABASE_URL.replace(/:[^:@]+@/, ':***@'));
  
  const pool = new Pool({ 
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 1
  });
  
  try {
    console.log('⏳ Connecting...');
    const client = await pool.connect();
    console.log('✅ Connected successfully!');
    
    console.log('⏳ Testing query...');
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Query successful:', result.rows[0]);
    
    client.release();
    await pool.end();
    console.log('✅ Connection test complete!');
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error details:', error);
    await pool.end();
    process.exit(1);
  }
}

testConnection();
