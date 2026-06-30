CREATE TABLE `club_baseline` (
	`id` text PRIMARY KEY NOT NULL,
	`club` text NOT NULL,
	`distance_yards` real NOT NULL,
	`dispersion` text NOT NULL,
	`tendency` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `course` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `course_intelligence` (
	`id` text PRIMARY KEY NOT NULL,
	`hole_id` text NOT NULL,
	`memory` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`hole_id`) REFERENCES `hole`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hole` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`number` integer NOT NULL,
	`par` integer NOT NULL,
	`geometry` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `player_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`confidence_modifiers` text NOT NULL,
	`miss_tendencies` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `round` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text,
	`weather` text NOT NULL,
	`aggression_default` text NOT NULL,
	`started_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shot` (
	`id` text PRIMARY KEY NOT NULL,
	`round_id` text NOT NULL,
	`hole_number` integer NOT NULL,
	`kind` text NOT NULL,
	`start_direction` text NOT NULL,
	`curve` text NOT NULL,
	`contact` text NOT NULL,
	`distance` text NOT NULL,
	`quality` text NOT NULL,
	`timestamp` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `round`(`id`) ON UPDATE no action ON DELETE no action
);
