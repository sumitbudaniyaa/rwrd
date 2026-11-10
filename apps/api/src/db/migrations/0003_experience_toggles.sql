ALTER TABLE "restaurants" ADD COLUMN "tipping_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "reviews_enabled" boolean DEFAULT true NOT NULL;
