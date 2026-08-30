ALTER TABLE "share_links" ADD COLUMN IF NOT EXISTS "photoIds" UUID[];
ALTER TABLE "share_links" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "share_links" ADD COLUMN IF NOT EXISTS "privateNotes" TEXT;
