import { Pool } from 'pg';
import type { DatabaseConnection } from '@shared/schema';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
}

export class MultiDatabaseManager {
  private connections: Map<string, Pool> = new Map();
  private activeConnectionId: string | null = null;

  /**
   * Test connection to a database
   */
  async testConnection(config: DatabaseConfig): Promise<{ success: boolean; message: string; latency?: number }> {
    const startTime = Date.now();
    let pool: Pool | null = null;

    try {
      pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
      });

      // Test the connection
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();

      const latency = Date.now() - startTime;

      return {
        success: true,
        message: 'Connection successful',
        latency,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Connection failed',
      };
    } finally {
      if (pool) {
        await pool.end();
      }
    }
  }

  /**
   * Add a new database connection
   */
  async addConnection(connectionId: string, config: DatabaseConfig): Promise<void> {
    const pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.connections.set(connectionId, pool);
  }

  /**
   * Remove a database connection
   */
  async removeConnection(connectionId: string): Promise<void> {
    const pool = this.connections.get(connectionId);
    if (pool) {
      await pool.end();
      this.connections.delete(connectionId);
    }

    // If we're removing the active connection, clear it
    if (this.activeConnectionId === connectionId) {
      this.activeConnectionId = null;
    }
  }

  /**
   * Set the active database connection
   */
  setActiveConnection(connectionId: string): void {
    if (this.connections.has(connectionId)) {
      this.activeConnectionId = connectionId;
    } else {
      throw new Error(`Connection ${connectionId} not found`);
    }
  }

  /**
   * Get the active database connection
   */
  getActiveConnection(): Pool | null {
    if (this.activeConnectionId) {
      return this.connections.get(this.activeConnectionId) || null;
    }
    return null;
  }

  /**
   * Get a specific database connection
   */
  getConnection(connectionId: string): Pool | null {
    return this.connections.get(connectionId) || null;
  }

  /**
   * Get all connection IDs
   */
  getAllConnectionIds(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    const promises = Array.from(this.connections.values()).map(pool => pool.end());
    await Promise.all(promises);
    this.connections.clear();
    this.activeConnectionId = null;
  }

  /**
   * Sync data from source database to target database
   */
  async syncDatabase(sourceId: string, targetId: string, tables: string[]): Promise<{ success: boolean; message: string }> {
    const sourcePool = this.getConnection(sourceId);
    const targetPool = this.getConnection(targetId);

    if (!sourcePool || !targetPool) {
      return {
        success: false,
        message: 'Source or target database connection not found',
      };
    }

    try {
      const sourceClient = await sourcePool.connect();
      const targetClient = await targetPool.connect();

      try {
        // Start transaction on target
        await targetClient.query('BEGIN');

        for (const table of tables) {
          // Get data from source
          const result = await sourceClient.query(`SELECT * FROM ${table}`);
          
          if (result.rows.length > 0) {
            // Clear target table
            await targetClient.query(`TRUNCATE TABLE ${table} CASCADE`);

            // Get column names
            const columns = Object.keys(result.rows[0]);
            const columnList = columns.join(', ');
            
            // Insert data into target
            for (const row of result.rows) {
              const values = columns.map(col => row[col]);
              const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
              
              await targetClient.query(
                `INSERT INTO ${table} (${columnList}) VALUES (${placeholders})`,
                values
              );
            }
          }
        }

        // Commit transaction
        await targetClient.query('COMMIT');

        return {
          success: true,
          message: `Successfully synced ${tables.length} tables`,
        };
      } catch (error: any) {
        await targetClient.query('ROLLBACK');
        throw error;
      } finally {
        sourceClient.release();
        targetClient.release();
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Sync failed',
      };
    }
  }

  /**
   * Get table list from a database
   */
  async getTables(connectionId: string): Promise<string[]> {
    const pool = this.getConnection(connectionId);
    if (!pool) {
      throw new Error('Database connection not found');
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);
      return result.rows.map(row => row.tablename);
    } finally {
      client.release();
    }
  }
}

// Singleton instance
export const multiDbManager = new MultiDatabaseManager();
