import { Router } from "express";
import { db, assetsTable, tripsTable } from "@workspace/db";
import { eq, desc, and, sum } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.id;
    const assets = await db
      .select()
      .from(assetsTable)
      .where(eq(assetsTable.userId, uid))
      .orderBy(desc(assetsTable.createdAt));

    const assetsWithMiles = await Promise.all(
      assets.map(async (asset) => {
        if (asset.type === "Truck") {
          const result = await db
            .select({ total: sum(tripsTable.loadedMiles) })
            .from(tripsTable)
            .where(and(eq(tripsTable.truckId, asset.id), eq(tripsTable.userId, uid)));
          const totalMiles = Number(result[0]?.total ?? 0);
          return { ...asset, totalMiles, createdAt: asset.createdAt.toISOString() };
        }
        return { ...asset, totalMiles: 0, createdAt: asset.createdAt.toISOString() };
      })
    );

    res.json(assetsWithMiles);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch assets" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const [asset] = await db
      .insert(assetsTable)
      .values({ ...req.body, userId: req.user!.id })
      .returning();
    res.status(201).json({ ...asset, totalMiles: 0, createdAt: asset.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to create asset" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(assetsTable).where(
      and(eq(assetsTable.id, parseInt(req.params.id)), eq(assetsTable.userId, req.user!.id))
    );
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete asset" });
  }
});

export default router;
