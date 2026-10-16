CREATE TYPE "public"."actor_type" AS ENUM('admin', 'guest', 'system');--> statement-breakpoint
CREATE TYPE "public"."qr_status" AS ENUM('active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."qr_type" AS ENUM('review', 'url');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor" "actor_type" NOT NULL,
	"action" text NOT NULL,
	"qr_id" uuid,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "place_cache" (
	"input_hash" text PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"name" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qr_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" "qr_type" DEFAULT 'review' NOT NULL,
	"destination_url" text NOT NULL,
	"default_url" text NOT NULL,
	"place_id" text,
	"business_name" text,
	"business_address" text,
	"status" "qr_status" DEFAULT 'active' NOT NULL,
	"reset_code_hash" text NOT NULL,
	"guest_reset_enabled" boolean DEFAULT true NOT NULL,
	"reset_code_rotated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"expired_url" text,
	"notes" text,
	"style" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scan_count" bigint DEFAULT 0 NOT NULL,
	"last_scanned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "qr_codes_slug_unique" UNIQUE("slug"),
	CONSTRAINT "qr_codes_slug_format" CHECK (slug ~ '^[0-9A-HJKMNP-TV-Z]{8}$'),
	CONSTRAINT "qr_codes_destination_url" CHECK (destination_url ~* '^https?://')
);
--> statement-breakpoint
CREATE TABLE "qr_daily_stats" (
	"qr_id" uuid NOT NULL,
	"day" date NOT NULL,
	"scans" integer DEFAULT 0 NOT NULL,
	"unique_visitors" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "qr_daily_stats_qr_id_day_pk" PRIMARY KEY("qr_id","day")
);
--> statement-breakpoint
CREATE TABLE "qr_destination_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"qr_id" uuid NOT NULL,
	"old_url" text,
	"new_url" text NOT NULL,
	"actor" "actor_type" NOT NULL,
	"actor_ip_hash" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reset_attempts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"qr_id" uuid,
	"slug_input" text,
	"ip_hash" text NOT NULL,
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"qr_id" uuid NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"country" text,
	"region" text,
	"city" text,
	"device" text,
	"os" text,
	"browser" text,
	"referrer" text,
	"ip_hash" text,
	"is_bot" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qr_daily_stats" ADD CONSTRAINT "qr_daily_stats_qr_id_qr_codes_id_fk" FOREIGN KEY ("qr_id") REFERENCES "public"."qr_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_destination_history" ADD CONSTRAINT "qr_destination_history_qr_id_qr_codes_id_fk" FOREIGN KEY ("qr_id") REFERENCES "public"."qr_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reset_attempts" ADD CONSTRAINT "reset_attempts_qr_id_qr_codes_id_fk" FOREIGN KEY ("qr_id") REFERENCES "public"."qr_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_qr_id_qr_codes_id_fk" FOREIGN KEY ("qr_id") REFERENCES "public"."qr_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "qr_codes_status_idx" ON "qr_codes" USING btree ("status") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "qr_codes_created_idx" ON "qr_codes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "qr_codes_search_idx" ON "qr_codes" USING gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(business_name, '')));--> statement-breakpoint
CREATE INDEX "qr_history_qr_idx" ON "qr_destination_history" USING btree ("qr_id","created_at");--> statement-breakpoint
CREATE INDEX "reset_attempts_qr_idx" ON "reset_attempts" USING btree ("qr_id","created_at");--> statement-breakpoint
CREATE INDEX "reset_attempts_ip_idx" ON "reset_attempts" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "scan_events_qr_time_idx" ON "scan_events" USING btree ("qr_id","scanned_at");