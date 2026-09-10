ALTER TABLE "Ticket"
ADD COLUMN "firstRespondedAt" TIMESTAMPTZ(3);

UPDATE "Ticket" AS ticket
SET "firstRespondedAt" = (
  SELECT MIN(comment."createdAt")
  FROM "TicketComment" AS comment
  INNER JOIN "Membership" AS membership
    ON membership."organizationId" = ticket."organizationId"
    AND membership."userId" = comment."authorId"
  WHERE comment."ticketId" = ticket."id"
    AND comment."visibility" = 'PUBLIC'
    AND comment."authorId" <> ticket."requesterId"
    AND membership."role" IN (
      'OWNER',
      'ADMIN',
      'MANAGER',
      'TECHNICIAN'
    )
)
WHERE EXISTS (
  SELECT 1
  FROM "TicketComment" AS comment
  INNER JOIN "Membership" AS membership
    ON membership."organizationId" = ticket."organizationId"
    AND membership."userId" = comment."authorId"
  WHERE comment."ticketId" = ticket."id"
    AND comment."visibility" = 'PUBLIC'
    AND comment."authorId" <> ticket."requesterId"
    AND membership."role" IN (
      'OWNER',
      'ADMIN',
      'MANAGER',
      'TECHNICIAN'
    )
);

CREATE INDEX "Ticket_organizationId_firstRespondedAt_idx"
ON "Ticket"("organizationId", "firstRespondedAt");
