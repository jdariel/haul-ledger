import { Router } from "express";
import { db, tripsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const trips = await db
      .select()
      .from(tripsTable)
      .orderBy(desc(tripsTable.date));
    res.json(trips.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trips" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [trip] = await db.insert(tripsTable).values(req.body).returning();
    res.status(201).json({ ...trip, createdAt: trip.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to create trip" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [trip] = await db
      .select()
      .from(tripsTable)
      .where(eq(tripsTable.id, parseInt(req.params.id)));
    if (!trip) return res.status(404).json({ error: "Not found" });
    res.json({ ...trip, createdAt: trip.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trip" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const [updated] = await db
      .update(tripsTable)
      .set({
        date: body.date,
        pickupLocation: body.pickupLocation ?? null,
        deliveryLocation: body.deliveryLocation ?? null,
        startOdometer: body.startOdometer,
        endOdometer: body.endOdometer,
        loadedMiles: body.loadedMiles,
        emptyMiles: body.emptyMiles,
        jurisdiction: body.jurisdiction,
        notes: body.notes ?? null,
      })
      .where(eq(tripsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to update trip" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(tripsTable).where(eq(tripsTable.id, parseInt(req.params.id)));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete trip" });
  }
});

export default router;
