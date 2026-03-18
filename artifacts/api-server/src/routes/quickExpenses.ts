import { Router } from "express";
import { db, quickExpensesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const items = await db
      .select()
      .from(quickExpensesTable)
      .orderBy(desc(quickExpensesTable.createdAt));
    res.json(items.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quick expenses" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [item] = await db.insert(quickExpensesTable).values(req.body).returning();
    res.status(201).json({ ...item, createdAt: item.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to create quick expense" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(quickExpensesTable).where(eq(quickExpensesTable.id, parseInt(req.params.id)));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete quick expense" });
  }
});

export default router;
