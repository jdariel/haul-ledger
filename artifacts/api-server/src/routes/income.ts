import { Router } from "express";
import { db, incomeTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

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
    const [entry] = await db.insert(incomeTable).values(req.body).returning();
    res.status(201).json({ ...entry, createdAt: entry.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to create income" });
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
