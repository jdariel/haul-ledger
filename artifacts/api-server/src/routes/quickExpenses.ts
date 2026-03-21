import { Router } from "express";
import { db, quickExpensesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const items = await db
      .select()
      .from(quickExpensesTable)
      .where(eq(quickExpensesTable.userId, req.user!.id))
      .orderBy(desc(quickExpensesTable.createdAt));
    res.json(items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quick expenses" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const [item] = await db
      .insert(quickExpensesTable)
      .values({ ...req.body, userId: req.user!.id })
      .returning();
    res.status(201).json({ ...item, createdAt: item.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to create quick expense" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(quickExpensesTable).where(
      and(eq(quickExpensesTable.id, parseInt(req.params.id)), eq(quickExpensesTable.userId, req.user!.id))
    );
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete quick expense" });
  }
});

export default router;
