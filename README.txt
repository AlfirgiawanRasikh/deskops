DeskOps ticket detail update

This package contains complete replacement and new files. Copy the src and
tests folders into the project root and allow Windows to replace matching
files.

What changes:
- The Context Rail Open full ticket control now opens /tickets/[ticketId].
- Adds a compact full ticket detail screen with conversation, metadata, and
  status/assignment activity.
- Public replies remain available to authorized users.
- OWNER, ADMIN, MANAGER, and TECHNICIAN can add internal notes.
- EMPLOYEE can only open tickets they requested and never receives internal
  comments.
- Cross-organization or unauthorized ticket IDs return the same not-found
  response and do not reveal ticket data.
- Adds authorization and input-schema coverage for internal notes.

No Prisma schema change, migration, seed, or dependency installation is
required.

After copying the files, run:

  npm test
  npm run lint
  npx tsc --noEmit
  npm run build

Manual check:
1. Sign in as OWNER or MANAGER and open a ticket from the Context Rail.
2. Send one public reply and add one internal note.
3. Confirm both appear in the conversation for the operational account.
4. Sign in as the EMPLOYEE who requested that ticket.
5. Confirm the public reply is visible and the internal note is absent.
6. Confirm the EMPLOYEE cannot open another employee's ticket by URL.
