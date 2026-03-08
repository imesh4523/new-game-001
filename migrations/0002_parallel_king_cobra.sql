CREATE TYPE "public"."telegram_signal_status" AS ENUM('pending', 'sent', 'updated', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "global_freeze_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"activated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deactivated_at" timestamp,
	"initiated_by" varchar NOT NULL,
	"total_users_affected" integer DEFAULT 0 NOT NULL,
	"total_amount_unfrozen" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_freeze_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"original_frozen_balance" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"restored" boolean DEFAULT false NOT NULL,
	"restored_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_signals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" text NOT NULL,
	"duration" integer NOT NULL,
	"colour" text NOT NULL,
	"message_id" integer,
	"chat_id" text NOT NULL,
	"status" "telegram_signal_status" DEFAULT 'pending' NOT NULL,
	"result" text,
	"sent_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX "global_freeze_sessions_status_idx" ON "global_freeze_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "global_freeze_snapshots_session_user_idx" ON "global_freeze_snapshots" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE INDEX "global_freeze_snapshots_user_id_idx" ON "global_freeze_snapshots" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "telegram_signals_game_id_idx" ON "telegram_signals" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "telegram_signals_status_idx" ON "telegram_signals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "telegram_signals_message_id_idx" ON "telegram_signals" USING btree ("message_id");--> statement-breakpoint
ALTER TABLE "device_logins" DROP COLUMN "ipv4_address";--> statement-breakpoint
ALTER TABLE "device_logins" DROP COLUMN "ipv6_address";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "registration_ipv4";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "registration_ipv6";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "last_login_ipv4";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "last_login_ipv6";