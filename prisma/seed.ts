import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

import { PrismaClient } from "../src/generated/prisma/client";


function requireEnvironmentVariable(
  name:
    | "DATABASE_URL"
    | "DESKOPS_DEMO_PASSWORD",
) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} environment variable is not configured.`,
    );
  }

  return value;
}

const connectionString =
  requireEnvironmentVariable("DATABASE_URL");

const demoPassword =
  requireEnvironmentVariable(
    "DESKOPS_DEMO_PASSWORD",
  );

if (demoPassword.length < 12) {
  throw new Error(
    "DESKOPS_DEMO_PASSWORD must contain at least 12 characters.",
  );
}

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not configured.");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const serviceLevelPolicyDefinitions = [
  {
    priority: "URGENT",
    firstResponseMinutes: 15,
    resolutionMinutes: 30,
  },
  {
    priority: "HIGH",
    firstResponseMinutes: 30,
    resolutionMinutes: 240,
  },
  {
    priority: "NORMAL",
    firstResponseMinutes: 120,
    resolutionMinutes: 480,
  },
  {
    priority: "LOW",
    firstResponseMinutes: 240,
    resolutionMinutes: 2880,
  },
] as const;

async function main() {
  const organization = await prisma.organization.upsert({
    where: {
      slug: "nusantara-systems",
    },
    update: {},
    create: {
      name: "Nusantara Systems",
      slug: "nusantara-systems",
      timezone: "Asia/Jakarta",
    },
  });

  for (const policy of serviceLevelPolicyDefinitions) {
    await prisma.serviceLevelPolicy.upsert({
      where: {
        organizationId_priority: {
          organizationId: organization.id,
          priority: policy.priority,
        },
      },
      update: {},
      create: {
        organizationId: organization.id,
        priority: policy.priority,
        firstResponseMinutes:
          policy.firstResponseMinutes,
        resolutionMinutes:
          policy.resolutionMinutes,
      },
    });
  }

  const people = [
    {
        key: "owner",
        name: "Alfirgiawan Rasikh",
        email: "alfirgiawan@deskops.local",
        role: "OWNER",
        department: "Technology",
    },
    {
        key: "manager",
        name: "Maya Sari",
        email: "maya.sari@deskops.local",
        role: "MANAGER",
        department: "IT Service Management",
    },
    {
        key: "rafi",
        name: "Rafi Akbar",
        email: "rafi.akbar@deskops.local",
        role: "TECHNICIAN",
        department: "Technology",
    },
    {
        key: "dimas",
        name: "Dimas Putra",
        email: "dimas.putra@deskops.local",
        role: "TECHNICIAN",
        department: "Technology",
    },
    {
        key: "nadia",
        name: "Nadia Prasetyo",
        email: "nadia.prasetyo@deskops.local",
        role: "EMPLOYEE",
        department: "Finance",
    },
    {
        key: "indra",
        name: "Indra Maulana",
        email: "indra.maulana@deskops.local",
        role: "EMPLOYEE",
        department: "People",
    },
    {
        key: "sarah",
        name: "Sarah Wijaya",
        email: "sarah.wijaya@deskops.local",
        role: "EMPLOYEE",
        department: "Sales",
    },
    {
        key: "bagas",
        name: "Bagas Putra",
        email: "bagas.putra@deskops.local",
        role: "EMPLOYEE",
        department: "Operations",
    },
    {
        key: "tia",
        name: "Tia Rahman",
        email: "tia.rahman@deskops.local",
        role: "EMPLOYEE",
        department: "Logistics",
    },
  ] as const;

  type PersonKey = (typeof people)[number]["key"];

  const userIds = new Map<PersonKey, string>();

  for (const person of people) {
    const user = await prisma.user.upsert({
      where: {
        email: person.email,
      },
      update: {
        name: person.name,
        emailVerified: true,
      },
      create: {
        name: person.name,
        email: person.email,
        emailVerified: true,
      },
    });

    userIds.set(person.key, user.id);

    const credentialIssuer =
      "local:credential";

    const existingCredentialAccount =
      await prisma.account.findFirst({
        where: {
          issuer: credentialIssuer,
          accountId: user.id,
        },
        select: {
          id: true,
          password: true,
        },
      });

    if (!existingCredentialAccount?.password) {
      const passwordHash = await hashPassword(
        demoPassword,
      );

      if (existingCredentialAccount) {
        await prisma.account.update({
          where: {
            id: existingCredentialAccount.id,
          },
          data: {
            providerId: "credential",
            userId: user.id,
            password: passwordHash,
          },
        });
      } else {
        await prisma.account.create({
          data: {
            id: `seed-credential-${person.key}`,
            issuer: credentialIssuer,
            accountId: user.id,
            providerId: "credential",
            userId: user.id,
            password: passwordHash,
          },
        });
      }
    }

    await prisma.membership.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: user.id,
        },
      },
      update: {
        role: person.role,
        status: "ACTIVE",
        department: person.department,
      },
      create: {
        organizationId: organization.id,
        userId: user.id,
        role: person.role,
        status: "ACTIVE",
        department: person.department,
        },
    });
  }

  function getUserId(key: PersonKey) {
    const id = userIds.get(key);

    if (!id) {
      throw new Error(`Seed user "${key}" was not created.`);
    }

    return id;
  }

  const assetDefinitions = [
    {
      assetTag: "NB-FIN-044",
      name: "Nadia's ThinkPad",
      type: "Laptop",
      status: "ASSIGNED",
      assignedToKey: "nadia",
      serialNumber: "PF4DESK044",
      manufacturer: "Lenovo",
      model: "ThinkPad T14",
      purchaseDate: new Date("2025-06-14T00:00:00.000Z"),
      warrantyExpiresAt: new Date("2028-06-14T00:00:00.000Z"),
    },
    {
      assetTag: "DSP-MTG-012",
      name: "Orchid Meeting Room Display",
      type: "Display",
      status: "ASSIGNED",
      assignedToKey: "sarah",
      serialNumber: "VBDESK012",
      manufacturer: "ViewSonic",
      model: "ViewBoard 65",
      purchaseDate: new Date("2024-09-20T00:00:00.000Z"),
      warrantyExpiresAt: new Date("2027-09-20T00:00:00.000Z"),
    },
    {
      assetTag: "NB-OPS-118",
      name: "Bagas's Latitude",
      type: "Laptop",
      status: "ASSIGNED",
      assignedToKey: "bagas",
      serialNumber: "DLLDESK118",
      manufacturer: "Dell",
      model: "Latitude 5440",
      purchaseDate: new Date("2025-02-11T00:00:00.000Z"),
      warrantyExpiresAt: new Date("2028-02-11T00:00:00.000Z"),
    },
    {
      assetTag: "SCN-WH-031",
      name: "Warehouse Scanner 31",
      type: "Scanner",
      status: "IN_REPAIR",
      assignedToKey: "tia",
      serialNumber: "ZBRDESK031",
      manufacturer: "Zebra",
      model: "TC21",
      purchaseDate: new Date("2024-03-08T00:00:00.000Z"),
      warrantyExpiresAt: new Date("2027-03-08T00:00:00.000Z"),
    },
    {
      assetTag: "NB-DES-019",
      name: "Design Team MacBook",
      type: "Laptop",
      status: "IN_STOCK",
      assignedToKey: null,
      serialNumber: "APLDSK019",
      manufacturer: "Apple",
      model: "MacBook Pro 14",
      purchaseDate: new Date("2026-07-15T00:00:00.000Z"),
      warrantyExpiresAt: new Date("2027-07-15T00:00:00.000Z"),
    },
  ] as const;

  type AssetTag = (typeof assetDefinitions)[number]["assetTag"];

  const assetIds = new Map<AssetTag, string>();

  for (const definition of assetDefinitions) {
    const assignedToId = definition.assignedToKey
      ? getUserId(definition.assignedToKey)
      : null;

    const asset = await prisma.asset.upsert({
      where: {
        organizationId_assetTag: {
          organizationId: organization.id,
          assetTag: definition.assetTag,
        },
      },
      update: {
        name: definition.name,
        type: definition.type,
        status: definition.status,
        assignedToId,
        serialNumber: definition.serialNumber,
        manufacturer: definition.manufacturer,
        model: definition.model,
        purchaseDate: definition.purchaseDate,
        warrantyExpiresAt: definition.warrantyExpiresAt,
      },
      create: {
        organizationId: organization.id,
        assetTag: definition.assetTag,
        name: definition.name,
        type: definition.type,
        status: definition.status,
        assignedToId,
        serialNumber: definition.serialNumber,
        manufacturer: definition.manufacturer,
        model: definition.model,
        purchaseDate: definition.purchaseDate,
        warrantyExpiresAt: definition.warrantyExpiresAt,
      },
    });

    assetIds.set(definition.assetTag, asset.id);
  }

  function getAssetId(assetTag: AssetTag) {
    const id = assetIds.get(assetTag);

    if (!id) {
      throw new Error(`Seed asset "${assetTag}" was not created.`);
    }

    return id;
  }

  const ticketDefinitions = [
    {
      number: 1042,
      type: "INCIDENT",
      title: "Finance VPN disconnects after sign-in",
      description:
        "Connection drops within a minute for four Finance users after this morning's client update.",
      priority: "URGENT",
      status: "IN_PROGRESS",
      source: "MANUAL",
      category: "Network / VPN",
      requesterKey: "nadia",
      assigneeKey: "rafi",
      assetTag: "NB-FIN-044",
      firstResponseDueAt: new Date("2026-08-22T09:15:00+07:00"),
      resolutionDueAt: new Date("2026-08-22T10:30:00+07:00"),
      createdAt: new Date("2026-08-22T08:30:00+07:00"),
    },
    {
      number: 1039,
      type: "SERVICE_REQUEST",
      title: "Adobe license for new design hire",
      description:
        "A Creative Cloud license is required before the new product designer starts on Monday.",
      priority: "NORMAL",
      status: "WAITING_APPROVAL",
      source: "PORTAL",
      category: "Software / License",
      requesterKey: "indra",
      assigneeKey: "manager",
      assetTag: "NB-DES-019",
      firstResponseDueAt: new Date("2026-08-22T11:00:00+07:00"),
      resolutionDueAt: new Date("2026-08-25T17:00:00+07:00"),
      createdAt: new Date("2026-08-22T08:05:00+07:00"),
    },
    {
      number: 1037,
      type: "INCIDENT",
      title: "Meeting room display cannot connect",
      description:
        "The Orchid room display is online but no longer appears as a wireless presentation target.",
      priority: "HIGH",
      status: "IN_PROGRESS",
      source: "PORTAL",
      category: "Hardware / Display",
      requesterKey: "sarah",
      assigneeKey: "dimas",
      assetTag: "DSP-MTG-012",
      firstResponseDueAt: new Date("2026-08-22T10:00:00+07:00"),
      resolutionDueAt: new Date("2026-08-22T14:30:00+07:00"),
      createdAt: new Date("2026-08-22T07:40:00+07:00"),
    },
    {
      number: 1035,
      type: "INCIDENT",
      title: "ERP access denied after team transfer",
      description:
        "The requester moved from Procurement to Operations and can no longer open the ERP inventory module.",
      priority: "HIGH",
      status: "OPEN",
      source: "PORTAL",
      category: "Access / ERP",
      requesterKey: "bagas",
      assigneeKey: null,
      assetTag: "NB-OPS-118",
      firstResponseDueAt: new Date("2026-08-22T11:30:00+07:00"),
      resolutionDueAt: new Date("2026-08-22T16:00:00+07:00"),
      createdAt: new Date("2026-08-22T07:15:00+07:00"),
    },
    {
      number: 1032,
      type: "SERVICE_REQUEST",
      title: "Replace damaged warehouse scanner",
      description:
        "The scanner reads barcodes intermittently after being dropped during the night shift.",
      priority: "NORMAL",
      status: "SCHEDULED",
      source: "MANUAL",
      category: "Hardware / Scanner",
      requesterKey: "tia",
      assigneeKey: "rafi",
      assetTag: "SCN-WH-031",
      firstResponseDueAt: new Date("2026-08-22T12:00:00+07:00"),
      resolutionDueAt: new Date("2026-08-23T12:00:00+07:00"),
      createdAt: new Date("2026-08-22T06:50:00+07:00"),
    },
  ] as const;

  const ticketIds = new Map<number, string>();

  for (const definition of ticketDefinitions) {
    const assigneeId = definition.assigneeKey
      ? getUserId(definition.assigneeKey)
      : null;

    const assetId = getAssetId(definition.assetTag);

    const data = {
      type: definition.type,
      title: definition.title,
      description: definition.description,
      priority: definition.priority,
      status: definition.status,
      source: definition.source,
      category: definition.category,
      requesterId: getUserId(definition.requesterKey),
      assigneeId,
      assetId,
      firstResponseDueAt: definition.firstResponseDueAt,
      resolutionDueAt: definition.resolutionDueAt,
      createdAt: definition.createdAt,
    };

    const ticket = await prisma.ticket.upsert({
      where: {
        organizationId_number: {
          organizationId: organization.id,
          number: definition.number,
        },
      },
      update: data,
      create: {
        organizationId: organization.id,
        number: definition.number,
        ...data,
      },
    });

    ticketIds.set(definition.number, ticket.id);
  }

  function getTicketId(number: number) {
    const id = ticketIds.get(number);

    if (!id) {
      throw new Error(`Seed ticket "${number}" was not created.`);
    }

    return id;
  }

  const comments = [
    {
      id: "seed-comment-1042-requester",
      ticketNumber: 1042,
      authorKey: "nadia",
      visibility: "PUBLIC",
      body:
        "The issue affects the reconciliation team. Reconnecting works briefly, but the VPN disconnects again.",
      createdAt: new Date("2026-08-22T08:36:00+07:00"),
    },
    {
      id: "seed-comment-1042-technician",
      ticketNumber: 1042,
      authorKey: "rafi",
      visibility: "PUBLIC",
      body:
        "I linked this incident to the VPN 5.4 rollout and requested diagnostic logs from the affected devices.",
      createdAt: new Date("2026-08-22T08:52:00+07:00"),
    },
    {
      id: "seed-comment-1037-internal",
      ticketNumber: 1037,
      authorKey: "dimas",
      visibility: "INTERNAL",
      body:
        "The room controller firmware may be incompatible with the display's latest wireless module update.",
      createdAt: new Date("2026-08-22T08:25:00+07:00"),
    },
    {
      id: "seed-comment-1032-technician",
      ticketNumber: 1032,
      authorKey: "rafi",
      visibility: "PUBLIC",
      body:
        "A replacement scanner has been reserved and will be installed during tomorrow's morning shift.",
      createdAt: new Date("2026-08-22T09:05:00+07:00"),
    },
  ] as const;

  for (const comment of comments) {
    const data = {
      ticketId: getTicketId(comment.ticketNumber),
      authorId: getUserId(comment.authorKey),
      visibility: comment.visibility,
      body: comment.body,
      createdAt: comment.createdAt,
    };

    await prisma.ticketComment.upsert({
      where: {
        id: comment.id,
      },
      update: data,
      create: {
        id: comment.id,
        ...data,
      },
    });
  }

  const events = [
    {
      id: "seed-event-1042-created",
      ticketNumber: 1042,
      actorKey: "nadia",
      action: "TICKET_CREATED",
      fromValue: null,
      toValue: "OPEN",
      metadata: {
        source: "MANUAL",
      },
      createdAt: new Date("2026-08-22T08:30:00+07:00"),
    },
    {
      id: "seed-event-1042-assigned",
      ticketNumber: 1042,
      actorKey: "manager",
      action: "ASSIGNEE_CHANGED",
      fromValue: null,
      toValue: "Rafi Akbar",
      metadata: {
        reason: "Network queue ownership",
      },
      createdAt: new Date("2026-08-22T08:42:00+07:00"),
    },
    {
      id: "seed-event-1042-status",
      ticketNumber: 1042,
      actorKey: "rafi",
      action: "STATUS_CHANGED",
      fromValue: "OPEN",
      toValue: "IN_PROGRESS",
      metadata: {
        reason: "Investigation started",
      },
      createdAt: new Date("2026-08-22T08:46:00+07:00"),
    },
    {
      id: "seed-event-1039-created",
      ticketNumber: 1039,
      actorKey: "indra",
      action: "TICKET_CREATED",
      fromValue: null,
      toValue: "WAITING_APPROVAL",
      metadata: {
        source: "PORTAL",
      },
      createdAt: new Date("2026-08-22T08:05:00+07:00"),
    },
    {
      id: "seed-event-1037-status",
      ticketNumber: 1037,
      actorKey: "dimas",
      action: "STATUS_CHANGED",
      fromValue: "OPEN",
      toValue: "IN_PROGRESS",
      metadata: {
        reason: "On-site diagnosis started",
      },
      createdAt: new Date("2026-08-22T08:10:00+07:00"),
    },
    {
      id: "seed-event-1035-created",
      ticketNumber: 1035,
      actorKey: "bagas",
      action: "TICKET_CREATED",
      fromValue: null,
      toValue: "OPEN",
      metadata: {
        source: "PORTAL",
      },
      createdAt: new Date("2026-08-22T07:15:00+07:00"),
    },
    {
      id: "seed-event-1032-scheduled",
      ticketNumber: 1032,
      actorKey: "rafi",
      action: "STATUS_CHANGED",
      fromValue: "OPEN",
      toValue: "SCHEDULED",
      metadata: {
        reason: "Replacement device reserved",
      },
      createdAt: new Date("2026-08-22T09:00:00+07:00"),
    },
  ] as const;

  for (const event of events) {
    const data = {
      ticketId: getTicketId(event.ticketNumber),
      actorId: getUserId(event.actorKey),
      action: event.action,
      fromValue: event.fromValue,
      toValue: event.toValue,
      metadata: event.metadata,
      createdAt: event.createdAt,
    };

    await prisma.ticketEvent.upsert({
      where: {
        id: event.id,
      },
      update: data,
      create: {
        id: event.id,
        ...data,
      },
    });
  }

  const [
    membershipCount,
    assetCount,
    ticketCount,
    commentCount,
    eventCount,
    serviceLevelPolicyCount,
  ] = await Promise.all([
    prisma.membership.count({
      where: {
        organizationId: organization.id,
      },
    }),
    prisma.asset.count({
      where: {
        organizationId: organization.id,
      },
    }),
    prisma.ticket.count({
      where: {
        organizationId: organization.id,
      },
    }),
    prisma.ticketComment.count({
      where: {
        ticket: {
          organizationId: organization.id,
        },
      },
    }),
    prisma.ticketEvent.count({
      where: {
        ticket: {
          organizationId: organization.id,
        },
      },
    }),
    prisma.serviceLevelPolicy.count({
      where: {
        organizationId: organization.id,
      },
    }),
  ]);

  const credentialAccountCount =
  await prisma.account.count({
    where: {
      issuer: "local:credential",
      providerId: "credential",
    },
  });

  console.log("DeskOps demo data is ready.");
  console.log(`Organization: ${organization.name}`);
  console.log(`Members: ${membershipCount}`);
  console.log(`Assets: ${assetCount}`);
  console.log(`Tickets: ${ticketCount}`);
  console.log(`Comments: ${commentCount}`);
  console.log(`Audit events: ${eventCount}`);
  console.log(
    `SLA policies: ${serviceLevelPolicyCount}`,
  );
  console.log(
    `Credential accounts: ${credentialAccountCount}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Failed to seed DeskOps database.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
