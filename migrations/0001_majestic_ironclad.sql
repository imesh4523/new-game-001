CREATE TYPE "public"."deposit_request_status" AS ENUM('pending', 'approved', 'rejected', 'completed');--> statement-breakpoint
CREATE TYPE "public"."telegram_reaction_order_status" AS ENUM('pending', 'processing', 'completed', 'partial', 'cancelled', 'failed');--> statement-breakpoint
CREATE TABLE "betting_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"bet_requirement" numeric(18, 2) NOT NULL,
	"duration_minutes" integer NOT NULL,
	"coin_reward" numeric(18, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposit_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"agent_id" varchar NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "deposit_request_status" DEFAULT 'pending' NOT NULL,
	"transaction_id" varchar,
	"payment_proof" text,
	"user_note" text,
	"agent_note" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "n1panel_reaction_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_message_id" bigint NOT NULL,
	"telegram_channel_id" text NOT NULL,
	"message_link" text NOT NULL,
	"service_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"n1panel_order_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"charge" numeric(18, 8),
	"start_count" text,
	"remains" text,
	"error_message" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quick_replies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shortcut" text NOT NULL,
	"message" text NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "quick_replies_shortcut_unique" UNIQUE("shortcut")
);
--> statement-breakpoint
CREATE TABLE "telegram_auto_join_channels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" text NOT NULL,
	"channel_name" text NOT NULL,
	"invite_link" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"auto_approve_join_requests" boolean DEFAULT false NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"last_link_refresh_at" timestamp,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "telegram_auto_join_channels_chat_id_unique" UNIQUE("chat_id")
);
--> statement-breakpoint
CREATE TABLE "telegram_groups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"telegram_id" text NOT NULL,
	"telegram_link" text,
	"service_id" integer NOT NULL,
	"service_name" text,
	"auto_react_enabled" boolean DEFAULT false NOT NULL,
	"reaction_count" integer DEFAULT 100 NOT NULL,
	"reaction_emojis" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "telegram_groups_telegram_id_unique" UNIQUE("telegram_id")
);
--> statement-breakpoint
CREATE TABLE "telegram_login_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"user_id" varchar,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "telegram_login_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "telegram_reaction_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" varchar NOT NULL,
	"order_id" text NOT NULL,
	"service_id" integer NOT NULL,
	"post_link" text NOT NULL,
	"quantity" integer NOT NULL,
	"charge" numeric(18, 2) NOT NULL,
	"status" "telegram_reaction_order_status" DEFAULT 'pending' NOT NULL,
	"start_count" integer,
	"remains" integer,
	"currency" text DEFAULT 'USD',
	"order_response" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "telegram_reaction_orders_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "telegram_reaction_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key" text NOT NULL,
	"api_url" text DEFAULT 'https://n1panel.com/api/v2' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"balance" numeric(18, 2),
	"last_balance_check" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_betting_task_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"task_id" varchar NOT NULL,
	"bet_accumulated" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"claimed_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whitelisted_ips" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_address" text NOT NULL,
	"account_count_at_whitelist" integer DEFAULT 0 NOT NULL,
	"current_account_count" integer DEFAULT 0 NOT NULL,
	"whitelisted_by" varchar NOT NULL,
	"whitelisted_reason" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"exceeded_threshold" boolean DEFAULT false NOT NULL,
	"threshold_exceeded_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "whitelisted_ips_ip_address_unique" UNIQUE("ip_address")
);
--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "device_logins" ADD COLUMN "ipv4_address" text;--> statement-breakpoint
ALTER TABLE "device_logins" ADD COLUMN "ipv6_address" text;--> statement-breakpoint
ALTER TABLE "passkeys" ADD COLUMN "rp_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "passkeys" ADD COLUMN "origin" text NOT NULL;--> statement-breakpoint
ALTER TABLE "passkeys" ADD COLUMN "is_domain_mismatch" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "frozen_balance" numeric(18, 8) DEFAULT '0.00000000' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "registration_ipv4" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "registration_ipv6" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_ipv4" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_ipv6" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "binance_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "min_deposit_amount" numeric(18, 2) DEFAULT '10.00';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "max_deposit_amount" numeric(18, 2) DEFAULT '10000.00';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_accepting_deposits" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "deposit_requests_user_id_idx" ON "deposit_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "deposit_requests_agent_id_idx" ON "deposit_requests" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "deposit_requests_status_idx" ON "deposit_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "n1panel_orders_message_id_idx" ON "n1panel_reaction_orders" USING btree ("telegram_message_id");--> statement-breakpoint
CREATE INDEX "n1panel_orders_status_idx" ON "n1panel_reaction_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "n1panel_orders_created_at_idx" ON "n1panel_reaction_orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "quick_replies_shortcut_idx" ON "quick_replies" USING btree ("shortcut");--> statement-breakpoint
CREATE INDEX "telegram_auto_join_priority_idx" ON "telegram_auto_join_channels" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "telegram_groups_telegram_id_idx" ON "telegram_groups" USING btree ("telegram_id");--> statement-breakpoint
CREATE INDEX "telegram_login_sessions_token_idx" ON "telegram_login_sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "telegram_login_sessions_expires_at_idx" ON "telegram_login_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "telegram_reaction_orders_group_id_idx" ON "telegram_reaction_orders" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "telegram_reaction_orders_status_idx" ON "telegram_reaction_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "telegram_reaction_orders_created_at_idx" ON "telegram_reaction_orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_betting_task_progress_user_task_idx" ON "user_betting_task_progress" USING btree ("user_id","task_id");--> statement-breakpoint
CREATE INDEX "whitelisted_ips_ip_address_idx" ON "whitelisted_ips" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "whitelisted_ips_is_active_idx" ON "whitelisted_ips" USING btree ("is_active");