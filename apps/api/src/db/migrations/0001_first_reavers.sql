ALTER TABLE "restaurant_users" DROP CONSTRAINT "uq_restaurant_user_email";--> statement-breakpoint
ALTER TABLE "restaurants" ALTER COLUMN "logo_url" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "restaurant_users" ALTER COLUMN "role" SET DEFAULT 'admin';--> statement-breakpoint
ALTER TABLE "staff" ALTER COLUMN "photo_url" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "restaurant_users" ADD CONSTRAINT "uq_restaurant_users_restaurant_id" UNIQUE("restaurant_id");--> statement-breakpoint
ALTER TABLE "restaurant_users" ADD CONSTRAINT "uq_restaurant_user_email" UNIQUE("email");