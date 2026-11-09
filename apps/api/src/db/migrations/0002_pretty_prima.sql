ALTER TABLE "billing_plans" ADD COLUMN "price_inr" integer DEFAULT 99 NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_plans" ADD COLUMN "duration_months" integer DEFAULT 1 NOT NULL;