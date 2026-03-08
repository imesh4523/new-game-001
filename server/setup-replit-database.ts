import { storage } from './storage';

async function setupReplitDatabase() {
  try {
    console.log('🔧 Setting up Replit PostgreSQL database...');
    
    // Check if DATABASE_URL exists
    if (!process.env.DATABASE_URL || !process.env.PGHOST) {
      console.error('❌ DATABASE_URL or PostgreSQL credentials not found');
      process.exit(1);
    }
    
    const dbHost = process.env.PGHOST;
    const dbPort = parseInt(process.env.PGPORT || '5432');
    const dbUser = process.env.PGUSER || 'neondb_owner';
    const dbName = process.env.PGDATABASE || 'neondb';
    const dbPassword = process.env.PGPASSWORD || '';
    
    console.log(`📊 Database Details:`);
    console.log(`   Host: ${dbHost}`);
    console.log(`   Port: ${dbPort}`);
    console.log(`   Database: ${dbName}`);
    console.log(`   User: ${dbUser}`);
    
    // Check if connection already exists
    const existingConnections = await storage.getAllDatabaseConnections();
    const replitConnection = existingConnections.connections.find(
      conn => conn.name === 'Replit Managed Database' || conn.host === dbHost
    );
    
    if (replitConnection) {
      console.log('✅ Replit database connection already exists');
      console.log(`   Connection ID: ${replitConnection.id}`);
      console.log(`   Status: ${replitConnection.status}`);
      console.log(`   Primary: ${replitConnection.isPrimary ? 'Yes' : 'No'}`);
      
      // Make sure it's set as primary
      if (!replitConnection.isPrimary) {
        console.log('🎯 Setting as primary database...');
        await storage.setPrimaryDatabaseConnection(replitConnection.id);
        console.log('✅ Set as primary database');
      }
      
      return;
    }
    
    // Create new database connection
    console.log('➕ Creating new database connection...');
    
    const connection = await storage.createDatabaseConnection({
      name: 'Replit Managed Database',
      databaseType: 'postgresql',
      host: dbHost,
      port: dbPort,
      database: dbName,
      username: dbUser,
      password: dbPassword,
      ssl: true,
      status: 'active',
      isActive: true,
      createdBy: 'system'
    });
    
    console.log('✅ Database connection created:', connection.id);
    
    // Set as primary
    console.log('🎯 Setting as primary database...');
    await storage.setPrimaryDatabaseConnection(connection.id);
    
    console.log('✅ Replit database setup complete!');
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  ✅ DATABASE CONNECTION CREATED                           ║
╠═══════════════════════════════════════════════════════════╣
║  Name:     Replit Managed Database                        ║
║  Type:     PostgreSQL (Neon)                              ║
║  Host:     ${dbHost.padEnd(45)} ║
║  Database: ${dbName.padEnd(45)} ║
║  Status:   🟢 ACTIVE + PRIMARY                             ║
╚═══════════════════════════════════════════════════════════╝
    `);
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupReplitDatabase();
