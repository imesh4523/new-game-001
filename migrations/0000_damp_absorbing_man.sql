CREATE TYPE "public"."bet_status" AS ENUM('pending', 'won', 'lost', 'cashed_out', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."bet_type" AS ENUM('color', 'number', 'size', 'crash');--> statement-breakpoint
CREATE TYPE "public"."database_status" AS ENUM('active', 'inactive', 'testing');--> statement-breakpoint
CREATE TYPE "public"."database_type" AS ENUM('postgresql', 'mysql', 'mongodb');--> statement-breakpoint
CREATE TYPE "public"."game_status" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."game_type" AS ENUM('color', 'crash');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('crypto', 'bank_transfer', 'agent', 'internal');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."support_chat_author" AS ENUM('user', 'support', 'system');--> statement-breakpoint
CREATE TYPE "public"."support_chat_status" AS ENUM('open', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('deposit', 'withdrawal', 'referral_bonus', 'agent_commission', 'commission_withdrawal');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'agent');--> statement-breakpoint
CREATE TYPE "public"."vip_level" AS ENUM('lv1', 'lv2', 'vip', 'vip1', 'vip2', 'vip3', 'vip4', 'vip5', 'vip6', 'vip7');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_request_status" AS ENUM('pending', 'approved', 'rejected', 'processing', 'completed');--> statement-breakpoint
CREATE TABLE "admin_actions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" varchar NOT NULL,
	"action" text NOT NULL,
	"target_id" varchar,
	"details" jsonb NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"action" text NOT NULL,
	"target_user_id" varchar,
	"amount" numeric(18, 8) NOT NULL,
	"commission_amount" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"transaction_id" varchar,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"commission_rate" numeric(5, 4) DEFAULT '0.0500' NOT NULL,
	"earnings_balance" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "agent_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "bets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"game_id" varchar NOT NULL,
	"bet_type" "bet_type" NOT NULL,
	"bet_value" text NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"potential" numeric(18, 8) NOT NULL,
	"actual_payout" numeric(18, 8),
	"status" "bet_status" DEFAULT 'pending' NOT NULL,
	"cash_out_multiplier" numeric(10, 2),
	"auto_cash_out" numeric(10, 2),
	"cashed_out_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "coin_flip_games" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"selected_side" text NOT NULL,
	"result" text NOT NULL,
	"bet_amount" numeric(18, 8) NOT NULL,
	"won" boolean NOT NULL,
	"win_amount" numeric(18, 8),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "database_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"database_type" "database_type" NOT NULL,
	"host" text NOT NULL,
	"port" integer NOT NULL,
	"database" text NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"ssl" boolean DEFAULT true NOT NULL,
	"status" "database_status" DEFAULT 'inactive' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"last_sync_at" timestamp,
	"last_test_at" timestamp,
	"connection_status" text,
	"created_by" varchar NOT NULL,
	"updated_by" varchar,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_logins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"device_fingerprint" text NOT NULL,
	"device_model" text NOT NULL,
	"device_type" text NOT NULL,
	"operating_system" text NOT NULL,
	"browser_name" text NOT NULL,
	"browser_version" text NOT NULL,
	"screen_width" integer,
	"screen_height" integer,
	"pixel_ratio" numeric(3, 2),
	"timezone" text,
	"language" text,
	"ip_address" text,
	"country" text,
	"login_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" varchar NOT NULL,
	"total_players" integer DEFAULT 0 NOT NULL,
	"total_bets" integer DEFAULT 0 NOT NULL,
	"total_volume" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"house_edge" numeric(5, 4) DEFAULT '0.0500' NOT NULL,
	"actual_profit" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"expected_profit" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"profit_margin" numeric(5, 4) DEFAULT '0.0000' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "game_analytics_game_id_unique" UNIQUE("game_id")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" text NOT NULL,
	"game_type" "game_type" DEFAULT 'color' NOT NULL,
	"round_duration" integer NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"status" "game_status" DEFAULT 'active' NOT NULL,
	"result" integer,
	"result_color" text,
	"result_size" text,
	"crash_point" numeric(10, 2),
	"current_multiplier" numeric(10, 2) DEFAULT '1.00',
	"crashed_at" timestamp,
	"is_manually_controlled" boolean DEFAULT false NOT NULL,
	"manual_result" integer,
	"total_bets_amount" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"total_payouts" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"house_profit" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "games_game_id_unique" UNIQUE("game_id")
);
--> statement-breakpoint
CREATE TABLE "golden_live_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"previous_value" integer NOT NULL,
	"new_value" integer NOT NULL,
	"increment_amount" integer DEFAULT 0 NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "golden_live_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"total_players" integer DEFAULT 0 NOT NULL,
	"active_players" integer DEFAULT 0 NOT NULL,
	"last_hourly_increase" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"image_url" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"sent_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"path" text NOT NULL,
	"ip_address" text NOT NULL,
	"country" text,
	"user_agent" text,
	"browser_name" text,
	"device_type" text,
	"device_model" text,
	"operating_system" text,
	"referrer" text,
	"session_id" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passkeys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" bigint DEFAULT 0 NOT NULL,
	"device_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "passkeys_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "predicted_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" varchar NOT NULL,
	"period_id" text NOT NULL,
	"result" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_code_redemptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promo_code_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"code" text NOT NULL,
	"amount_awarded" numeric(18, 8) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"total_value" numeric(18, 8) NOT NULL,
	"min_value" numeric(18, 8) NOT NULL,
	"max_value" numeric(18, 8) NOT NULL,
	"usage_limit" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"require_deposit" boolean DEFAULT false NOT NULL,
	"vip_level_upgrade" "vip_level",
	"expires_at" timestamp,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh_key" text NOT NULL,
	"auth_key" text NOT NULL,
	"user_agent" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" varchar NOT NULL,
	"referred_id" varchar NOT NULL,
	"referral_level" integer DEFAULT 1 NOT NULL,
	"commission_rate" numeric(5, 4) DEFAULT '0.0600' NOT NULL,
	"total_commission" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"has_deposited" boolean DEFAULT false NOT NULL,
	"status" "referral_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "referrals_referred_id_unique" UNIQUE("referred_id")
);
--> statement-breakpoint
CREATE TABLE "support_chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"author" "support_chat_author" NOT NULL,
	"author_telegram_id" text,
	"body" text NOT NULL,
	"metadata" jsonb,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_chat_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"session_token" text NOT NULL,
	"user_display_name" text NOT NULL,
	"telegram_chat_id" text,
	"status" "support_chat_status" DEFAULT 'open' NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"closed_at" timestamp,
	CONSTRAINT "support_chat_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"is_encrypted" boolean DEFAULT false NOT NULL,
	"last_updated_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"agent_id" varchar,
	"type" "transaction_type" NOT NULL,
	"fiat_amount" numeric(18, 2),
	"crypto_amount" numeric(36, 18),
	"fiat_currency" text DEFAULT 'USD',
	"crypto_currency" text,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"external_id" text,
	"payment_address" text,
	"tx_hash" text,
	"fee" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"ip_address" text NOT NULL,
	"user_agent" text,
	"browser_name" text,
	"browser_version" text,
	"device_type" text,
	"device_model" text,
	"operating_system" text,
	"login_time" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"logout_time" timestamp,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" varchar,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"withdrawal_password_hash" text,
	"profile_photo" text,
	"balance" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"accumulated_fee" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"vip_level" "vip_level" DEFAULT 'lv1' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"referral_code" text,
	"referred_by" varchar,
	"referral_level" integer DEFAULT 1 NOT NULL,
	"total_deposits" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"total_withdrawals" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"total_winnings" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"total_losses" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"total_commission" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"lifetime_commission_earned" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"total_bets_amount" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"daily_wager_amount" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"last_wager_reset_date" timestamp DEFAULT CURRENT_TIMESTAMP,
	"remaining_required_bet_amount" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"team_size" integer DEFAULT 0 NOT NULL,
	"total_team_members" integer DEFAULT 0 NOT NULL,
	"registration_ip" text,
	"registration_country" text,
	"last_login_ip" text,
	"last_login_device_model" text,
	"last_login_device_type" text,
	"last_login_device_os" text,
	"last_login_browser" text,
	"telegram_id" text,
	"telegram_link_token" text,
	"telegram_link_expires_at" timestamp,
	"telegram_username" text,
	"telegram_first_name" text,
	"telegram_photo_url" text,
	"max_bet_limit" numeric(18, 8) DEFAULT '999999.00000000' NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_secret" text,
	"is_banned" boolean DEFAULT false NOT NULL,
	"banned_until" timestamp,
	"ban_reason" text,
	"enable_animations" boolean DEFAULT true NOT NULL,
	"wingo_mode" boolean DEFAULT false NOT NULL,
	"last_withdrawal_request_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "users_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code"),
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id"),
	CONSTRAINT "users_telegram_link_token_unique" UNIQUE("telegram_link_token")
);
--> statement-breakpoint
CREATE TABLE "vip_level_telegram_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vip_level" "vip_level" NOT NULL,
	"telegram_link" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "vip_level_telegram_links_vip_level_unique" UNIQUE("vip_level")
);
--> statement-breakpoint
CREATE TABLE "vip_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level_key" text NOT NULL,
	"level_name" text NOT NULL,
	"level_order" integer NOT NULL,
	"team_requirement" integer DEFAULT 0 NOT NULL,
	"max_bet" numeric(18, 8) DEFAULT '100000000.00000000' NOT NULL,
	"daily_wager_reward" numeric(10, 6) DEFAULT '0.000000' NOT NULL,
	"commission_rates" text DEFAULT '[]' NOT NULL,
	"recharge_amount" numeric(18, 8) DEFAULT '1000.00000000' NOT NULL,
	"telegram_link" text,
	"support_email" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "vip_settings_level_key_unique" UNIQUE("level_key"),
	CONSTRAINT "vip_settings_level_name_unique" UNIQUE("level_name"),
	CONSTRAINT "vip_settings_level_order_unique" UNIQUE("level_order")
);
--> statement-breakpoint
CREATE TABLE "withdrawal_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"wallet_address" text NOT NULL,
	"status" "withdrawal_request_status" DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"required_bet_amount" numeric(18, 8) NOT NULL,
	"current_bet_amount" numeric(18, 8) NOT NULL,
	"eligible" boolean DEFAULT false NOT NULL,
	"duplicate_ip_count" integer DEFAULT 0 NOT NULL,
	"duplicate_ip_user_ids" text[],
	"commission_amount" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"winnings_amount" numeric(18, 8) DEFAULT '0.00000000' NOT NULL,
	"balance_frozen" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp,
	"processed_by" varchar,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX "admin_actions_admin_id_idx" ON "admin_actions" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "agent_activities_agent_id_idx" ON "agent_activities" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "bets_user_id_idx" ON "bets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bets_game_id_idx" ON "bets" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "bets_status_idx" ON "bets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "coin_flip_games_user_id_idx" ON "coin_flip_games" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "coin_flip_games_created_at_idx" ON "coin_flip_games" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "device_logins_user_id_idx" ON "device_logins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "device_logins_fingerprint_idx" ON "device_logins" USING btree ("device_fingerprint");--> statement-breakpoint
CREATE INDEX "games_status_idx" ON "games" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "page_views_user_id_idx" ON "page_views" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "page_views_path_idx" ON "page_views" USING btree ("path");--> statement-breakpoint
CREATE INDEX "page_views_created_at_idx" ON "page_views" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "predicted_results_admin_id_idx" ON "predicted_results" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "predicted_results_period_id_idx" ON "predicted_results" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "promo_code_redemptions_promo_code_id_idx" ON "promo_code_redemptions" USING btree ("promo_code_id");--> statement-breakpoint
CREATE INDEX "promo_code_redemptions_user_id_idx" ON "promo_code_redemptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "promo_code_redemptions_user_code_idx" ON "promo_code_redemptions" USING btree ("user_id","code");--> statement-breakpoint
CREATE INDEX "promo_codes_code_idx" ON "promo_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "promo_codes_is_active_idx" ON "promo_codes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "referrals_referrer_id_idx" ON "referrals" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "support_chat_messages_session_id_idx" ON "support_chat_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "support_chat_messages_created_at_idx" ON "support_chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "support_chat_sessions_token_idx" ON "support_chat_sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "support_chat_sessions_status_idx" ON "support_chat_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_external_id_idx" ON "transactions" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vip_level_telegram_links_vip_level_idx" ON "vip_level_telegram_links" USING btree ("vip_level");--> statement-breakpoint
CREATE INDEX "withdrawal_requests_user_id_idx" ON "withdrawal_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "withdrawal_requests_status_idx" ON "withdrawal_requests" USING btree ("status");