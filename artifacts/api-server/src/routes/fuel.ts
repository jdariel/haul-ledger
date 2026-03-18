import { Router } from "express";
import { db, fuelEntriesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const entries = await db
      .select()
      .from(fuelEntriesTable)
      .orderBy(desc(fuelEntriesTable.createdAt));
    res.json(entries.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch fuel entries" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [entry] = await db.insert(fuelEntriesTable).values(req.body).returning();
    res.status(201).json({ ...entry, createdAt: entry.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to create fuel entry" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(fuelEntriesTable).where(eq(fuelEntriesTable.id, parseInt(req.params.id)));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete fuel entry" });
  }
});

export default router;
