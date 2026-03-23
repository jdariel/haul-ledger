import { Router } from "express";
import { db, expensesTable, fuelEntriesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.id;
    let expenses = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.userId, uid))
      .orderBy(desc(expensesTable.createdAt));

    if (req.query.category) {
      expenses = expenses.filter((e) => e.category === req.query.category);
    }
    if (req.query.week === "true") {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      expenses = expenses.filter((e) => new Date(e.date) >= startOfWeek);
    }
    if (req.query.search) {
      const search = (req.query.search as string).toLowerCase();
      expenses = expenses.filter((e) => e.merchant.toLowerCase().includes(search));
    }

    res.json(expenses.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.id;
    const body = { ...req.body, userId: uid };

    const isFuel =
      body.category === "Fuel" &&
      body.gallons != null &&
      body.pricePerGallon != null &&
      parseFloat(body.gallons) > 0 &&
      parseFloat(body.pricePerGallon) > 0;

    const result = await db.transaction(async (tx) => {
      const [expense] = await tx.insert(expensesTable).values(body).returning();
      if (isFuel) {
        await tx.insert(fuelEntriesTable).values({
          userId: uid,
          date: body.date,
          vendor: body.merchant,
          gallons: parseFloat(body.gallons),
          pricePerGallon: parseFloat(body.pricePerGallon),
          jurisdiction: body.jurisdiction ?? "N/A",
          totalAmount: body.amount ?? parseFloat(body.gallons) * parseFloat(body.pricePerGallon),
          truckId: body.truckId ?? null,
        });
      }
      return expense;
    });

    res.status(201).json({ ...result, createdAt: result.createdAt.toISOString() });
  } catch (err) {
    console.error("Create expense error:", err);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const [expense] = await db
      .select()
      .from(expensesTable)
      .where(and(eq(expensesTable.id, parseInt(req.params.id)), eq(expensesTable.userId, req.user!.id)));
    if (!expense) return res.status(404).json({ error: "Not found" });
    res.json({ ...expense, createdAt: expense.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch expense" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const [updated] = await db
      .update(expensesTable)
      .set({
        date: body.date,
        merchant: body.merchant,
        category: body.category,
        amount: body.amount,
        notes: body.notes ?? null,
        gallons: body.gallons ?? null,
        pricePerGallon: body.pricePerGallon ?? null,
        jurisdiction: body.jurisdiction ?? null,
        receiptUrl: body.receiptUrl ?? null,
        paymentMethod: body.paymentMethod ?? null,
      })
      .where(and(eq(expensesTable.id, id), eq(expensesTable.userId, req.user!.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to update expense" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(expensesTable).where(
      and(eq(expensesTable.id, parseInt(req.params.id)), eq(expensesTable.userId, req.user!.id))
    );
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

export default router;
