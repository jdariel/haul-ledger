import { Router } from "express";
import { db, incomeTable, tripsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

function extractState(location: string): string | null {
  const match = location.trim().match(/,\s*([A-Z]{2})$/);
  return match ? match[1] : null;
}

router.get("/", async (req, res) => {
  try {
    const income = await db
      .select()
      .from(incomeTable)
      .orderBy(desc(incomeTable.createdAt));

    let result = income;

    if (req.query.week === "true") {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      result = result.filter((i) => new Date(i.date) >= startOfWeek);
    }

    res.json(result.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch income" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const [entry] = await db.insert(incomeTable).values(body).returning();

    if (
      entry.pickupLocation &&
      entry.deliveryLocation &&
      entry.loadedMiles != null &&
      entry.loadedMiles > 0
    ) {
      const jurisdiction = extractState(entry.deliveryLocation) ?? extractState(entry.pickupLocation) ?? null;
      const totalMiles = (entry.loadedMiles ?? 0) + (entry.emptyMiles ?? 0);
      await db.insert(tripsTable).values({
        date: entry.date,
        pickupLocation: entry.pickupLocation,
        deliveryLocation: entry.deliveryLocation,
        loadedMiles: entry.loadedMiles,
        emptyMiles: entry.emptyMiles ?? 0,
        startOdometer: 0,
        endOdometer: Math.round(totalMiles),
        jurisdiction: jurisdiction ?? "N/A",
        notes: `Auto-logged from income: ${entry.source}`,
      });
    }

    res.status(201).json({ ...entry, createdAt: entry.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create income" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [entry] = await db
      .select()
      .from(incomeTable)
      .where(eq(incomeTable.id, parseInt(req.params.id)));
    if (!entry) return res.status(404).json({ error: "Not found" });
    res.json({ ...entry, createdAt: entry.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch income" });
  }
});

router.put("/:id", async (req, res) => {
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
      .where(eq(incomeTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to update income" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(incomeTable).where(eq(incomeTable.id, parseInt(req.params.id)));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete income" });
  }
});

export default router;
