-- CreateTable
CREATE TABLE "ServiceLevelPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL,
    "firstResponseMinutes" INTEGER NOT NULL,
    "resolutionMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ServiceLevelPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" VARCHAR(80) NOT NULL,
    "fromValue" JSONB,
    "toValue" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceLevelPolicy_organizationId_idx" ON "ServiceLevelPolicy"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceLevelPolicy_organizationId_priority_key" ON "ServiceLevelPolicy"("organizationId", "priority");

-- CreateIndex
CREATE INDEX "OrganizationEvent_organizationId_createdAt_idx" ON "OrganizationEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "OrganizationEvent_actorId_idx" ON "OrganizationEvent"("actorId");

-- AddForeignKey
ALTER TABLE "ServiceLevelPolicy" ADD CONSTRAINT "ServiceLevelPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationEvent" ADD CONSTRAINT "OrganizationEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationEvent" ADD CONSTRAINT "OrganizationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
