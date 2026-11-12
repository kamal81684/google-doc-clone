-- Shares with emails that have no account yet; claimed on sign-up
CREATE TABLE "DocumentInvite" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "PermissionRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentInvite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentInvite_email_idx" ON "DocumentInvite"("email");

CREATE UNIQUE INDEX "DocumentInvite_documentId_email_key" ON "DocumentInvite"("documentId", "email");

ALTER TABLE "DocumentInvite" ADD CONSTRAINT "DocumentInvite_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
