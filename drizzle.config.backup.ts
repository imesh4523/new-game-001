import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.BACKUP_DB_HOST || "your-db-host.com",
    port: parseInt(process.env.BACKUP_DB_PORT || "25060"),
    user: process.env.BACKUP_DB_USER || "username",
    password: process.env.BACKUP_DB_PASSWORD || "password",
    database: process.env.BACKUP_DB_NAME || "dbname",
    ssl: { rejectUnauthorized: false }
  },
});
