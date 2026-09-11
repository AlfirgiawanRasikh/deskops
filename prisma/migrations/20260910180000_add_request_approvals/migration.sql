-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_APPROVAL_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_APPROVAL_DECIDED';

-- CreateEnum
CREATE TYPE "TicketApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "TicketApproval" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" "TicketApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestNote" VARCHAR(500),
    "decisionNote" VARCHAR(500),
    "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),

    CONSTRAINT "TicketApproval_pkey" PRIMARY KEY ("id")
);

-- Only one unresolved approval can exist for a ticket.
CREATE UNIQUE INDEX "TicketApproval_one_pending_per_ticket_idx"
ON "TicketApproval"("ticketId")
WHERE "status" = 'PENDING';

CREATE INDEX "TicketApproval_ticketId_requestedAt_idx"
ON "TicketApproval"("ticketId", "requestedAt");

CREATE INDEX "TicketApproval_approverId_status_requestedAt_idx"
ON "TicketApproval"("approverId", "status", "requestedAt");

CREATE INDEX "TicketApproval_requestedById_idx"
ON "TicketApproval"("requestedById");

ALTER TABLE "TicketApproval"
ADD CONSTRAINT "TicketApproval_ticketId_fkey"
FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketApproval"
ADD CONSTRAINT "TicketApproval_requestedById_fkey"
FOREIGN KEY ("requestedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TicketApproval"
ADD CONSTRAINT "TicketApproval_approverId_fkey"
FOREIGN KEY ("approverId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
