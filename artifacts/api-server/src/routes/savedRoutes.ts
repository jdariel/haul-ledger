import { Router } from "express";
import { db, savedRoutesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const routes = await db
      .select()
      .from(savedRoutesTable)
      .orderBy(desc(savedRoutesTable.createdAt));
    res.json(routes.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch saved routes" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [route] = await db.insert(savedRoutesTable).values(req.body).returning();
    res.status(201).json({ ...route, createdAt: route.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to create saved route" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(savedRoutesTable).where(eq(savedRoutesTable.id, parseInt(req.params.id)));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete saved route" });
  }
});

export default router;
