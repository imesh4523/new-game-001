import "dotenv/config";
import { pool, db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";

async function checkUser(email: string) {
  if (!db) {
    console.log("❌ Database connection not established.");
    process.exit(1);
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (user) {
      console.log(`✅ User found: ${user.email}`);
      console.log(`- ID: ${user.id}`);
      console.log(`- Role: ${user.role}`);
      console.log(`- Is Active: ${user.isActive}`);
      console.log(`- Password Hash exists: ${!!user.passwordHash}`);
    } else {
      console.log(`❌ User not found: ${email}`);
    }
  } catch (error) {
    console.error("❌ Error checking user:", error);
  } finally {
    process.exit(0);
  }
}

const email = "imeshcheak@gmail.com";
checkUser(email);
