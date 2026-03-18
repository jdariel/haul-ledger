import { Router } from "express";
import { db, assetsTable, tripsTable } from "@workspace/db";
import { eq, desc, sum } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const assets = await db
      .select()
      .from(assetsTable)
      .orderBy(desc(assetsTable.createdAt));

    const assetsWithMiles = await Promise.all(
      assets.map(async (asset) => {
        if (asset.type === "Truck") {
          const result = await db
            .select({ total: sum(tripsTable.loadedMiles) })
            .from(tripsTable)
            .where(eq(tripsTable.truckId, asset.id));
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

router.post("/", async (req, res) => {
  try {
    const [asset] = await db.insert(assetsTable).values(req.body).returning();
    res.status(201).json({ ...asset, totalMiles: 0, createdAt: asset.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to create asset" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(assetsTable).where(eq(assetsTable.id, parseInt(req.params.id)));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete asset" });
  }
});

export default router;
