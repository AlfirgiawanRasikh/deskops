CREATE TYPE "TicketResolutionStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED', 'REOPENED');

CREATE TYPE "TicketResolutionCategory" AS ENUM ('SOFTWARE_CONFIGURATION', 'ACCOUNT_ACCESS', 'HARDWARE_REPAIR', 'NETWORK_FIX', 'SECURITY_REMEDIATION', 'USER_GUIDANCE', 'NO_FAULT_FOUND', 'OTHER');

ALTER TYPE "NotificationType" ADD VALUE 'TICKET_RESOLVED';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_RESOLUTION_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_REOPENED';

CREATE TABLE "TicketResolution" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "resolvedById" TEXT NOT NULL,
    "status" "TicketResolutionStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "category" "TicketResolutionCategory" NOT NULL,
    "summary" TEXT NOT NULL,
    "resolvedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMPTZ(3),
    "reopenedAt" TIMESTAMPTZ(3),
    "reopenReason" VARCHAR(1000),

    CONSTRAINT "TicketResolution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TicketResolution_ticketId_resolvedAt_idx" ON "TicketResolution"("ticketId", "resolvedAt");
CREATE INDEX "TicketResolution_resolvedById_idx" ON "TicketResolution"("resolvedById");
CREATE UNIQUE INDEX "TicketResolution_one_pending_per_ticket_idx" ON "TicketResolution"("ticketId") WHERE "status" = 'PENDING_CONFIRMATION';

ALTER TABLE "TicketResolution" ADD CONSTRAINT "TicketResolution_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketResolution" ADD CONSTRAINT "TicketResolution_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
