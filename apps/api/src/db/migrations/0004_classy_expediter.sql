CREATE TABLE "impersonation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"impersonator_id" uuid NOT NULL,
	"impersonator_email" varchar(255) NOT NULL,
	"reason" varchar(500) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"token" text,
	"expires_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "impersonation_requests" ADD CONSTRAINT "impersonation_requests_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impersonation_requests" ADD CONSTRAINT "impersonation_requests_impersonator_id_platform_users_id_fk" FOREIGN KEY ("impersonator_id") REFERENCES "public"."platform_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_impersonation_requests_restaurant" ON "impersonation_requests" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "idx_impersonation_requests_status" ON "impersonation_requests" USING btree ("status");