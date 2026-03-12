CREATE TYPE "public"."telegram_scheduled_post_status" AS ENUM('active', 'paused', 'completed');--> statement-breakpoint
CREATE TABLE "advanced_crash_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deep_thinking_enabled" boolean DEFAULT false NOT NULL,
	"no_bet_bait_min_multiplier" numeric(10, 2) DEFAULT '7.00' NOT NULL,
	"no_bet_bait_max_multiplier" numeric(10, 2) DEFAULT '20.00' NOT NULL,
	"whale_target_min_multiplier" numeric(5, 2) DEFAULT '1.01' NOT NULL,
	"whale_target_max_multiplier" numeric(5, 2) DEFAULT '1.04' NOT NULL,
	"standard_loss_max_threshold" numeric(5, 2) DEFAULT '2.00' NOT NULL,
	"player_win_probability" numeric(5, 2) DEFAULT '40.00' NOT NULL,
	"updated_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crash_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"house_edge" numeric(5, 2) DEFAULT '20.00' NOT NULL,
	"max_multiplier" numeric(10, 2) DEFAULT '50.00' NOT NULL,
	"min_crash_multiplier" numeric(5, 2) DEFAULT '1.01' NOT NULL,
	"crash_enabled" boolean DEFAULT true NOT NULL,
	"updated_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_scheduled_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" text NOT NULL,
	"title" text NOT NULL,
	"message_text" text NOT NULL,
	"photo_path" text,
	"photo_url" text,
	"buttons" text,
	"schedule_time" text,
	"timezone" text DEFAULT 'Asia/Colombo' NOT NULL,
	"repeat_daily" boolean DEFAULT true NOT NULL,
	"days_of_week" text DEFAULT '0,1,2,3,4,5,6',
	"period_id" text,
	"status" "telegram_scheduled_post_status" DEFAULT 'active' NOT NULL,
	"last_sent_at" timestamp,
	"next_run_at" timestamp,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX "telegram_scheduled_posts_channel_id_idx" ON "telegram_scheduled_posts" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "telegram_scheduled_posts_status_idx" ON "telegram_scheduled_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "telegram_scheduled_posts_next_run_at_idx" ON "telegram_scheduled_posts" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "telegram_scheduled_posts_period_id_idx" ON "telegram_scheduled_posts" USING btree ("period_id");