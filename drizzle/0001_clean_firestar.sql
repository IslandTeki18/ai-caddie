CREATE TABLE `sync_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `round` ADD `completed_at` integer;