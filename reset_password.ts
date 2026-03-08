import "dotenv/config";
import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";
import * as bcrypt from "bcrypt";

async function resetPassword(email: string, newPassword: string) {
  if (!db) {
    console.log("❌ Database connection not established.");
    process.exit(1);
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const [user] = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.email, email))
      .returning();

    if (user) {
      console.log(`✅ Password reset successfully for: ${user.email}`);
    } else {
      console.log(`❌ User not found: ${email}`);
    }
  } catch (error) {
    console.error("❌ Error resetting password:", error);
  } finally {
    process.exit(0);
  }
}

const email = "imeshcheak@gmail.com";
const newPassword = "Imesh@2005Imesh";
resetPassword(email, newPassword);
