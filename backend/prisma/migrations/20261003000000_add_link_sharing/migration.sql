-- CreateEnum
CREATE TYPE "LinkAccess" AS ENUM ('RESTRICTED', 'VIEWER', 'EDITOR');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "linkAccess" "LinkAccess" NOT NULL DEFAULT 'RESTRICTED';
