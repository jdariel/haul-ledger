import { Router } from "express";
import { eq, and, desc, sum, count } from "drizzle-orm";
import {
  db, fleetsTable, fleetMembersTable, usersTable,
  expensesTable, incomeTable, tripsTable, fuelEntriesTable,
} from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { randomBytes } from "crypto";

const router = Router();

function generateInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

// GET /api/fleet — get current user's fleet info (as owner or driver)
router.get("/", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.id;
    const membership = await db
      .select({ fleetId: fleetMembersTable.fleetId, role: fleetMembersTable.role })
      .from(fleetMembersTable)
      .where(eq(fleetMembersTable.userId, uid))
      .limit(1);

    if (!membership.length) return res.json(null);

    const [fleet] = await db.select().from(fleetsTable).where(eq(fleetsTable.id, membership[0].fleetId));
    if (!fleet) return res.json(null);

    const members = await db
      .select({
        id: fleetMembersTable.id,
        userId: fleetMembersTable.userId,
        role: fleetMembersTable.role,
        joinedAt: fleetMembersTable.joinedAt,
        name: usersTable.name,
        email: usersTable.email,
      })
      .from(fleetMembersTable)
      .innerJoin(usersTable, eq(usersTable.id, fleetMembersTable.userId))
      .where(eq(fleetMembersTable.fleetId, fleet.id));

    res.json({
      ...fleet,
      role: membership[0].role,
      members,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch fleet" });
  }
});

// POST /api/fleet — create a new fleet
router.post("/", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.id;
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Fleet name is required." });

    const existing = await db
      .select({ id: fleetMembersTable.id })
      .from(fleetMembersTable)
      .where(eq(fleetMembersTable.userId, uid))
      .limit(1);
    if (existing.length) return res.status(400).json({ error: "You are already in a fleet. Leave it first." });

    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 5) {
      const dupe = await db.select({ id: fleetsTable.id }).from(fleetsTable).where(eq(fleetsTable.inviteCode, inviteCode)).limit(1);
      if (!dupe.length) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    const [fleet] = await db.insert(fleetsTable).values({ name: name.trim(), ownerId: uid, inviteCode }).returning();
    await db.insert(fleetMembersTable).values({ fleetId: fleet.id, userId: uid, role: "owner" });

    res.status(201).json({ ...fleet, role: "owner" });
  } catch {
    res.status(500).json({ error: "Failed to create fleet" });
  }
});

// POST /api/fleet/join — join by invite code
router.post("/join", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.id;
    const { inviteCode } = req.body;
    if (!inviteCode?.trim()) return res.status(400).json({ error: "Invite code is required." });

    const existing = await db
      .select({ id: fleetMembersTable.id })
      .from(fleetMembersTable)
      .where(eq(fleetMembersTable.userId, uid))
      .limit(1);
    if (existing.length) return res.status(400).json({ error: "You are already in a fleet. Leave it first." });

    const [fleet] = await db.select().from(fleetsTable).where(eq(fleetsTable.inviteCode, inviteCode.trim().toUpperCase()));
    if (!fleet) return res.status(404).json({ error: "Invalid invite code." });

    await db.insert(fleetMembersTable).values({ fleetId: fleet.id, userId: uid, role: "driver" });
    res.json({ message: "Joined fleet successfully." });
  } catch {
    res.status(500).json({ error: "Failed to join fleet" });
  }
});

// POST /api/fleet/leave — leave current fleet
router.post("/leave", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.id;
    const [membership] = await db
      .select()
      .from(fleetMembersTable)
      .where(eq(fleetMembersTable.userId, uid))
      .limit(1);

    if (!membership) return res.status(404).json({ error: "You are not in a fleet." });
    if (membership.role === "owner") return res.status(400).json({ error: "Fleet owners cannot leave. Delete the fleet instead." });

    await db.delete(fleetMembersTable).where(eq(fleetMembersTable.id, membership.id));
    res.json({ message: "Left fleet successfully." });
  } catch {
    res.status(500).json({ error: "Failed to leave fleet" });
  }
});

// DELETE /api/fleet — delete fleet (owner only)
router.delete("/", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.id;
    const [fleet] = await db.select().from(fleetsTable).where(eq(fleetsTable.ownerId, uid)).limit(1);
    if (!fleet) return res.status(404).json({ error: "Fleet not found." });

    await db.delete(fleetMembersTable).where(eq(fleetMembersTable.fleetId, fleet.id));
    await db.delete(fleetsTable).where(eq(fleetsTable.id, fleet.id));
    res.json({ message: "Fleet deleted." });
  } catch {
    res.status(500).json({ error: "Failed to delete fleet" });
  }
});

// DELETE /api/fleet/members/:userId — remove a driver (owner only)
router.delete("/members/:userId", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.id;
    const targetId = parseInt(req.params.userId);

    const [fleet] = await db.select().from(fleetsTable).where(eq(fleetsTable.ownerId, uid)).limit(1);
    if (!fleet) return res.status(403).json({ error: "Only the fleet owner can remove members." });
    if (targetId === uid) return res.status(400).json({ error: "Cannot remove yourself." });

    await db
      .delete(fleetMembersTable)
      .where(and(eq(fleetMembersTable.fleetId, fleet.id), eq(fleetMembersTable.userId, targetId)));
    res.json({ message: "Member removed." });
  } catch {
    res.status(500).json({ error: "Failed to remove member" });
  }
});

// GET /api/fleet/overview — fleet-wide stats (owner only)
router.get("/overview", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.id;
    const [fleet] = await db.select().from(fleetsTable).where(eq(fleetsTable.ownerId, uid)).limit(1);
    if (!fleet) return res.status(403).json({ error: "Only fleet owners can view the overview." });

    const members = await db
      .select({ userId: fleetMembersTable.userId, name: usersTable.name, role: fleetMembersTable.role })
      .from(fleetMembersTable)
      .innerJoin(usersTable, eq(usersTable.id, fleetMembersTable.userId))
      .where(eq(fleetMembersTable.fleetId, fleet.id));

    const driverIds = members.map(m => m.userId);

    const driverStats = await Promise.all(
      driverIds.map(async (driverId) => {
        const member = members.find(m => m.userId === driverId)!;

        const [expRow] = await db
          .select({ total: sum(expensesTable.amount), cnt: count() })
          .from(expensesTable)
          .where(eq(expensesTable.userId, driverId));

        const [incRow] = await db
          .select({ total: sum(incomeTable.amount), cnt: count() })
          .from(incomeTable)
          .where(eq(incomeTable.userId, driverId));

        const [tripRow] = await db
          .select({ cnt: count() })
          .from(tripsTable)
          .where(eq(tripsTable.userId, driverId));

        const [fuelRow] = await db
          .select({ total: sum(fuelEntriesTable.totalAmount), gallons: sum(fuelEntriesTable.gallons) })
          .from(fuelEntriesTable)
          .where(eq(fuelEntriesTable.userId, driverId));

        const recentExpenses = await db
          .select()
          .from(expensesTable)
          .where(eq(expensesTable.userId, driverId))
          .orderBy(desc(expensesTable.createdAt))
          .limit(3);

        return {
          userId: driverId,
          name: member.name,
          role: member.role,
          expenses: { total: parseFloat(expRow?.total ?? "0"), count: Number(expRow?.cnt ?? 0) },
          income: { total: parseFloat(incRow?.total ?? "0"), count: Number(incRow?.cnt ?? 0) },
          trips: Number(tripRow?.cnt ?? 0),
          fuel: { total: parseFloat(fuelRow?.total ?? "0"), gallons: parseFloat(fuelRow?.gallons ?? "0") },
          recentExpenses,
        };
      })
    );

    res.json({ fleet, members: driverStats });
  } catch (err) {
    console.error("Fleet overview error:", err);
    res.status(500).json({ error: "Failed to fetch fleet overview" });
  }
});

export default router;
