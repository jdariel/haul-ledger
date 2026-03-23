import { Router } from "express";
import { db, fuelEntriesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const entries = await db
      .select()
      .from(fuelEntriesTable)
      .where(eq(fuelEntriesTable.userId, req.user!.id))
      .orderBy(desc(fuelEntriesTable.createdAt));
    res.json(entries.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch fuel entries" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const [entry] = await db
      .insert(fuelEntriesTable)
      .values({ ...req.body, userId: req.user!.id })
      .returning();
    res.status(201).json({ ...entry, createdAt: entry.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to create fuel entry" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(fuelEntriesTable).where(
      and(eq(fuelEntriesTable.id, parseInt(req.params.id)), eq(fuelEntriesTable.userId, req.user!.id))
    );
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete fuel entry" });
  }
});

export default router;
