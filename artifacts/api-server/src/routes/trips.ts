import { Router } from "express";
import { db, tripsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const trips = await db
      .select()
      .from(tripsTable)
      .orderBy(desc(tripsTable.createdAt));
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

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(tripsTable).where(eq(tripsTable.id, parseInt(req.params.id)));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete trip" });
  }
});

export default router;
