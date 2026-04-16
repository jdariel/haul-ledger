import { Router } from "express";
import { resolveTargetUserId } from "../utils/fleetOwnership";
import { db, incomeTable, tripsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

function extractState(location: string): string | null {
  const match = location.trim().match(/,\s*([A-Z]{2})$/);
  return match ? match[1] : null;
}

function buildTripValues(entry: any, uid: number) {
  const jurisdiction =
    extractState(entry.deliveryLocation) ??
    extractState(entry.pickupLocation) ??
    null;
  const totalMiles = (entry.loadedMiles ?? 0) + (entry.emptyMiles ?? 0);
  return {
    userId: uid,
    incomeId: entry.id,
    date: entry.date,
    pickupLocation: entry.pickupLocation,
    deliveryLocation: entry.deliveryLocation,
    loadedMiles: entry.loadedMiles,
    emptyMiles: entry.emptyMiles ?? 0,
    startOdometer: 0,
    endOdometer: Math.round(totalMiles),
    jurisdiction: jurisdiction ?? "N/A",
    notes: `Auto-logged from income: ${entry.source}`,
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    let income = await db
      .select()
      .from(incomeTable)
      .where(eq(incomeTable.userId, req.user!.id))
      .orderBy(desc(incomeTable.createdAt));

    if (req.query.week === "true") {
      const now = new Date();
      const startOfWeek = new Date(now);
      const dayOfWeek = now.getDay();
      startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      startOfWeek.setHours(0, 0, 0, 0);
      income = income.filter((i) => new Date(i.date + "T00:00:00") >= startOfWeek);
    }

    res.json(income.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch income" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const requesterId = req.user!.id;
    const uid = await resolveTargetUserId(requesterId, req.body.forUserId);
    const body = { ...req.body, userId: uid };
    delete body.forUserId;
    const [entry] = await db.insert(incomeTable).values(body).returning();

    if (
      entry.pickupLocation &&
      entry.deliveryLocation &&
      entry.loadedMiles != null &&
      entry.loadedMiles > 0
    ) {
      await db.insert(tripsTable).values(buildTripValues(entry, uid));
    }

    res.status(201).json({ ...entry, createdAt: entry.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create income" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const [entry] = await db
      .select()
      .from(incomeTable)
      .where(and(eq(incomeTable.id, parseInt(req.params.id)), eq(incomeTable.userId, req.user!.id)));
    if (!entry) return res.status(404).json({ error: "Not found" });
    res.json({ ...entry, createdAt: entry.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch income" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const [updated] = await db
      .update(incomeTable)
      .set({
        date: body.date,
        source: body.source,
        amount: body.amount,
        pickupLocation: body.pickupLocation ?? null,
        deliveryLocation: body.deliveryLocation ?? null,
        loadedMiles: body.loadedMiles ?? null,
        emptyMiles: body.emptyMiles ?? null,
        trailerNumber: body.trailerNumber ?? null,
        routeName: body.routeName ?? null,
        notes: body.notes ?? null,
      })
      .where(and(eq(incomeTable.id, id), eq(incomeTable.userId, req.user!.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });

    // Upsert the linked trip whenever the income entry has location + miles
    if (
      updated.pickupLocation &&
      updated.deliveryLocation &&
      updated.loadedMiles != null &&
      updated.loadedMiles > 0
    ) {
      const tripValues = buildTripValues(updated, req.user!.id);
      // First try finding the trip by incomeId link; fall back to legacy notes match
      let [existingTrip] = await db
        .select({ id: tripsTable.id })
        .from(tripsTable)
        .where(eq(tripsTable.incomeId, updated.id))
        .limit(1);

      if (!existingTrip) {
        // Legacy: trip may have been created before incomeId column existed
        const [legacyTrip] = await db
          .select({ id: tripsTable.id })
          .from(tripsTable)
          .where(
            and(
              eq(tripsTable.userId, req.user!.id),
              eq(tripsTable.notes, `Auto-logged from income: ${updated.source}`)
            )
          )
          .limit(1);
        if (legacyTrip) {
          // Back-link this trip to the income entry
          await db
            .update(tripsTable)
            .set({ incomeId: updated.id })
            .where(eq(tripsTable.id, legacyTrip.id));
          existingTrip = legacyTrip;
        }
      }

      if (existingTrip) {
        await db
          .update(tripsTable)
          .set({
            date: tripValues.date,
            pickupLocation: tripValues.pickupLocation,
            deliveryLocation: tripValues.deliveryLocation,
            loadedMiles: tripValues.loadedMiles,
            emptyMiles: tripValues.emptyMiles,
            endOdometer: tripValues.endOdometer,
            jurisdiction: tripValues.jurisdiction,
            notes: tripValues.notes,
          })
          .where(eq(tripsTable.id, existingTrip.id));
      } else {
        await db.insert(tripsTable).values(tripValues);
      }
    }

    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update income" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(incomeTable).where(
      and(eq(incomeTable.id, parseInt(req.params.id)), eq(incomeTable.userId, req.user!.id))
    );
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete income" });
  }
});

export default router;
