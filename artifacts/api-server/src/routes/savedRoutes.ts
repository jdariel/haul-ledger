import { Router } from "express";
import { db, savedRoutesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const routes = await db
      .select()
      .from(savedRoutesTable)
      .where(eq(savedRoutesTable.userId, req.user!.id))
      .orderBy(desc(savedRoutesTable.createdAt));
    res.json(routes.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch saved routes" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const [route] = await db
      .insert(savedRoutesTable)
      .values({ ...req.body, userId: req.user!.id })
      .returning();
    res.status(201).json({ ...route, createdAt: route.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to create saved route" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(savedRoutesTable).where(
      and(eq(savedRoutesTable.id, parseInt(req.params.id)), eq(savedRoutesTable.userId, req.user!.id))
    );
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete saved route" });
  }
});

export default router;
