import "dotenv/config";
import { db } from "./server/db";
import { users } from "./shared/schema";

async function listUsers() {
  if (!db) {
    console.log("❌ Database connection not established.");
    process.exit(1);
  }

  try {
    const allUsers = await db.select().from(users).limit(10);
    console.log(`✅ Found ${allUsers.length} users:`);
    allUsers.forEach((u: any) => {
      console.log(`- ${u.email} (ID: ${u.id}, Role: ${u.role})`);
    });
  } catch (error) {
    console.error("❌ Error listing users:", error);
  } finally {
    process.exit(0);
  }
}

listUsers();
