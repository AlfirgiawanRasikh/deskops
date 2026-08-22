DeskOps ticket assignment update

This package contains complete replacement files. Copy the src and tests
folders into the project root and allow Windows to replace matching files.

What changes:
- Adds a compact assignee selector to the ticket Context Rail.
- Only active TECHNICIAN memberships from the current organization are listed.
- OWNER, ADMIN, MANAGER, and TECHNICIAN can assign or unassign tickets.
- EMPLOYEE receives no assignment capability and no technician option list.
- Every real change writes an ASSIGNEE_CHANGED audit event.
- Assignment mutations validate the actor, organization, active ticket, and
  assignee membership again on the server.
- Adds policy and input-schema tests for assignment behavior.

No Prisma schema change or migration is required.

After copying the files, run:

  npm test
  npm run lint
  npx tsc --noEmit
  npm run build

Manual check:
1. Sign in as OWNER or MANAGER.
2. Select a ticket and change Assignee in the Context Rail.
3. Confirm the queue owner and latest activity update after refresh.
4. Choose Unassigned and confirm the ticket returns to the unassigned queue.
5. Sign in as EMPLOYEE and confirm Assignee is read-only.
