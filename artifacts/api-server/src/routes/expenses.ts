import { Router } from "express";
import { db, expensesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const expenses = await db
      .select()
      .from(expensesTable)
      .orderBy(desc(expensesTable.createdAt));

    let result = expenses;

    if (req.query.category) {
      result = result.filter((e) => e.category === req.query.category);
    }

    if (req.query.week === "true") {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      result = result.filter((e) => new Date(e.date) >= startOfWeek);
    }

    if (req.query.search) {
      const search = (req.query.search as string).toLowerCase();
      result = result.filter((e) =>
        e.merchant.toLowerCase().includes(search)
      );
    }

    res.json(result.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [expense] = await db.insert(expensesTable).values(req.body).returning();
    res.status(201).json({ ...expense, createdAt: expense.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to create expense" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(expensesTable).where(eq(expensesTable.id, parseInt(req.params.id)));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

export default router;
