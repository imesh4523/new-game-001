"use strict";
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.pool = void 0;
var serverless_1 = require("@neondatabase/serverless");
var pg_1 = require("pg");
var neon_serverless_1 = require("drizzle-orm/neon-serverless");
var node_postgres_1 = require("drizzle-orm/node-postgres");
var ws_1 = require("ws");
var schema = require("@shared/schema");
serverless_1.neonConfig.webSocketConstructor = ws_1.default;
var DATABASE_URL = ((_a = process.env.DO_DATABASE_URL) === null || _a === void 0 ? void 0 : _a.trim()) || ((_b = process.env.DATABASE_URL) === null || _b === void 0 ? void 0 : _b.trim()) || (((_c = process.env.PGHOST) === null || _c === void 0 ? void 0 : _c.trim())
    ? "postgresql://".concat(process.env.PGUSER, ":").concat(process.env.PGPASSWORD, "@").concat(process.env.PGHOST, ":").concat(process.env.PGPORT || '5432', "/").concat(process.env.PGDATABASE)
    : '');
var isValidDatabaseUrl = DATABASE_URL &&
    DATABASE_URL !== 'postgresql://:::5432/' &&
    !DATABASE_URL.includes('undefined') &&
    DATABASE_URL.length > 20;
if (!isValidDatabaseUrl) {
    console.log('DATABASE_URL not found - using in-memory storage');
    console.log('Note: Data will not persist between server restarts');
    console.log('Using in-memory storage (for development/testing)');
}
// Check if it's a Neon database or other PostgreSQL (like Digital Ocean)
var isNeonDatabase = DATABASE_URL.includes('neon.tech');
var pool = null;
exports.pool = pool;
var db = null;
exports.db = db;
if (isValidDatabaseUrl) {
    try {
        if (isNeonDatabase) {
            // Use Neon serverless for Neon databases
            exports.pool = pool = new serverless_1.Pool({ connectionString: DATABASE_URL });
            exports.db = db = (0, neon_serverless_1.drizzle)({ client: pool, schema: schema });
            console.log("✅ Database connection established using Neon PostgreSQL");
        }
        else {
            // Use regular pg for other PostgreSQL databases (Digital Ocean, etc.)
            // Parse connection string and rebuild with proper SSL config
            try {
                var urlObj = new URL(DATABASE_URL);
                var sslRequired = urlObj.searchParams.get('sslmode') === 'require';
                // Remove sslmode from connection string as we'll handle SSL separately
                urlObj.searchParams.delete('sslmode');
                var cleanUrl = urlObj.toString();
                exports.pool = pool = new pg_1.Pool({
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
                exports.db = db = (0, node_postgres_1.drizzle)(pool, { schema: schema });
                console.log("✅ Database connection established using PostgreSQL (Digital Ocean)");
            }
            catch (urlError) {
                console.error('❌ Invalid DATABASE_URL format:', urlError.message);
                console.error('   Expected format: postgresql://user:pass@host:port/dbname?sslmode=require');
                console.error('   Check that the URL starts with "postgresql://" and has no quotes or whitespace');
                console.error('   Falling back to in-memory storage');
                exports.pool = pool = null;
                exports.db = db = null;
            }
        }
    }
    catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('   Falling back to in-memory storage');
        exports.pool = pool = null;
        exports.db = db = null;
    }
}
