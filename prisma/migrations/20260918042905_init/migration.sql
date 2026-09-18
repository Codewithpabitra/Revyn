-- CreateTable
CREATE TABLE "Installation" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "installationId" INTEGER NOT NULL,
    "githubLogin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Installation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "repoFullName" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "prTitle" TEXT NOT NULL,
    "headSha" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "issuesFound" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Installation_clerkUserId_key" ON "Installation"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Installation_installationId_key" ON "Installation"("installationId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "Installation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
