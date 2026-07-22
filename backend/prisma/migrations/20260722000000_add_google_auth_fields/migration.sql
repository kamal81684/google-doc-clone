-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN "googleId" TEXT,
    ADD COLUMN "avatar" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "public"."User"("googleId");
