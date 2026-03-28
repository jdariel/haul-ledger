import { Router } from "express";
import { eq, and, avg, sum, desc } from "drizzle-orm";
import {
  db, costSettingsTable, fuelEntriesTable, tripsTable,
  expensesTable, incomeTable,
} from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router = Router();

function mapLabelToCategory(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("insurance")) return "Insurance";
  if (l.includes("parking")) return "Parking";
  if (l.includes("maintenance")) return "Maintenance";
  if (l.includes("repair")) return "Repairs";
  if (l.includes("toll")) return "Tolls";
  if (l.includes("fuel") || l.includes("gas")) return "Fuel";
  if (l.includes("scale")) return "Scale Fee";
  if (l.includes("lumper")) return "Lumper";
  return "Other";
}

async function createExpenseForCost(
  userId: string,
  label: string,
  amount: number,
  frequency: string,
  dateStr?: string,
) {
  if (frequency === "per_mile") return null;
  const today = dateStr ?? new Date().toISOString().slice(0, 10);
  const [expense] = await db
    .insert(expensesTable)
    .values({
      userId,
      date: today,
      amount,
      merchant: label,
      category: mapLabelToCategory(label),
      notes: "Auto-logged from Cost Setup",
    })
    .returning();
  return expense;
}

// GET /api/cost-settings
router.get("/", requireAuth, async (req, res) => {
  try {
    const items = await db
      .select()
      .from(costSettingsTable)
      .where(eq(costSettingsTable.userId, req.user!.id))
      .orderBy(desc(costSettingsTable.createdAt));
    res.json(items);
  } catch {
    res.status(500).json({ error: "Failed to fetch cost settings" });
  }
});

// POST /api/cost-settings — creates cost setting AND auto-logs as expense
router.post("/", requireAuth, async (req, res) => {
  try {
    const { label, amount, frequency, logExpense } = req.body;
    if (!label?.trim()) return res.status(400).json({ error: "Label is required" });
    if (!amount || isNaN(parseFloat(amount))) return res.status(400).json({ error: "Valid amount required" });
    const freq = frequency || "monthly";
    if (!["monthly", "weekly", "annual", "per_mile"].includes(freq))
      return res.status(400).json({ error: "Invalid frequency" });

    const [item] = await db
      .insert(costSettingsTable)
      .values({ userId: req.user!.id, label: label.trim(), amount: parseFloat(amount), frequency: freq })
      .returning();

    // Auto-log to expenses (skip per_mile — no fixed date amount)
    let expense = null;
    if (freq !== "per_mile" && logExpense !== false) {
      expense = await createExpenseForCost(req.user!.id, label.trim(), parseFloat(amount), freq);
    }

    res.status(201).json({ ...item, expenseLogged: !!expense });
  } catch {
    res.status(500).json({ error: "Failed to create cost setting" });
  }
});

// PUT /api/cost-settings/:id
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { label, amount, frequency } = req.body;
    const updates: Record<string, any> = {};
    if (label?.trim()) updates.label = label.trim();
    if (amount != null && !isNaN(parseFloat(amount))) updates.amount = parseFloat(amount);
    if (frequency) updates.frequency = frequency;

    const [item] = await db
      .update(costSettingsTable)
      .set(updates)
      .where(and(eq(costSettingsTable.id, id), eq(costSettingsTable.userId, req.user!.id)))
      .returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch {
    res.status(500).json({ error: "Failed to update cost setting" });
  }
});

// DELETE /api/cost-settings/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const [deleted] = await db
      .delete(costSettingsTable)
      .where(and(eq(costSettingsTable.id, id), eq(costSettingsTable.userId, req.user!.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Cost setting not found" });
    res.json({ message: "Deleted", id });
  } catch (err) {
    console.error("Delete cost setting error:", err);
    res.status(500).json({ error: "Failed to delete cost setting" });
  }
});

// POST /api/cost-settings/:id/log-expense — manually log a single cost to expenses for today
router.post("/:id/log-expense", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [item] = await db
      .select()
      .from(costSettingsTable)
      .where(and(eq(costSettingsTable.id, id), eq(costSettingsTable.userId, req.user!.id)));
    if (!item) return res.status(404).json({ error: "Not found" });
    if (item.frequency === "per_mile")
      return res.status(400).json({ error: "Per-mile costs cannot be directly logged to expenses" });

    const expense = await createExpenseForCost(req.user!.id, item.label, item.amount, item.frequency, req.body.date);
    res.status(201).json(expense);
  } catch {
    res.status(500).json({ error: "Failed to log expense" });
  }
});

// POST /api/cost-settings/log-all — log all fixed costs as expenses for a given date
router.post("/log-all", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.id;
    const dateStr: string = req.body.date ?? new Date().toISOString().slice(0, 10);

    const items = await db
      .select()
      .from(costSettingsTable)
      .where(eq(costSettingsTable.userId, uid));

    const loggable = items.filter((i) => i.frequency !== "per_mile");
    if (loggable.length === 0) return res.json({ logged: 0, expenses: [] });

    const expenses = await Promise.all(
      loggable.map((i) => createExpenseForCost(uid, i.label, i.amount, i.frequency, dateStr)),
    );

    res.status(201).json({ logged: expenses.length, expenses });
  } catch {
    res.status(500).json({ error: "Failed to log all expenses" });
  }
});

// GET /api/cost-settings/analysis — live metrics from real data
router.get("/analysis", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.id;

    const [fuelAgg] = await db
      .select({
        avgPricePerGallon: avg(fuelEntriesTable.pricePerGallon),
        totalGallons: sum(fuelEntriesTable.gallons),
        totalFuelCost: sum(fuelEntriesTable.totalAmount),
      })
      .from(fuelEntriesTable)
      .where(eq(fuelEntriesTable.userId, uid));

    const avgFuelCostPerGallon = parseFloat(fuelAgg?.avgPricePerGallon ?? "0") || 0;
    const totalGallons = parseFloat(fuelAgg?.totalGallons ?? "0") || 0;
    const totalFuelCost = parseFloat(fuelAgg?.totalFuelCost ?? "0") || 0;

    const tripRows = await db
      .select({ loadedMiles: tripsTable.loadedMiles, emptyMiles: tripsTable.emptyMiles })
      .from(tripsTable)
      .where(eq(tripsTable.userId, uid));

    const totalMiles = tripRows.reduce((acc, t) => acc + (t.loadedMiles ?? 0) + (t.emptyMiles ?? 0), 0);

    const truckMpg = totalGallons > 0 && totalMiles > 0
      ? parseFloat((totalMiles / totalGallons).toFixed(2))
      : 0;

    const [expAgg] = await db
      .select({ total: sum(expensesTable.amount) })
      .from(expensesTable)
      .where(eq(expensesTable.userId, uid));
    const totalExpenses = parseFloat(expAgg?.total ?? "0") || 0;

    const [incAgg] = await db
      .select({ total: sum(incomeTable.amount) })
      .from(incomeTable)
      .where(eq(incomeTable.userId, uid));
    const totalIncome = parseFloat(incAgg?.total ?? "0") || 0;

    const costItems = await db
      .select()
      .from(costSettingsTable)
      .where(eq(costSettingsTable.userId, uid));

    const freqToMonthly: Record<string, number> = {
      monthly: 1,
      weekly: 52 / 12,
      annual: 1 / 12,
      per_mile: 0,
    };

    let fixedMonthlyCost = 0;
    let perMileFixed = 0;
    for (const c of costItems) {
      const mult = freqToMonthly[c.frequency] ?? 1;
      if (c.frequency === "per_mile") {
        perMileFixed += c.amount;
      } else {
        fixedMonthlyCost += c.amount * mult;
      }
    }

    const monthsOfData = tripRows.length > 0 ? Math.max(1, totalMiles / 10000) : 1;
    const milesPerMonth = totalMiles > 0 ? totalMiles / monthsOfData : 0;

    const variableCostPerMile = totalMiles > 0
      ? parseFloat(((totalExpenses) / totalMiles).toFixed(4))
      : 0;
    const costPerMile = totalMiles > 0
      ? parseFloat(((totalExpenses + fixedMonthlyCost * monthsOfData) / totalMiles + perMileFixed).toFixed(4))
      : 0;
    const revenuePerMile = totalMiles > 0
      ? parseFloat((totalIncome / totalMiles).toFixed(4))
      : 0;
    const netPerMile = parseFloat((revenuePerMile - costPerMile).toFixed(4));
    const marginPerMile = revenuePerMile - variableCostPerMile - perMileFixed;
    const breakEvenMilesPerMonth = fixedMonthlyCost > 0 && marginPerMile > 0
      ? Math.round(fixedMonthlyCost / marginPerMile)
      : 0;

    res.json({
      avgFuelCostPerGallon: parseFloat(avgFuelCostPerGallon.toFixed(3)),
      totalGallons: parseFloat(totalGallons.toFixed(1)),
      totalFuelCost: parseFloat(totalFuelCost.toFixed(2)),
      truckMpg,
      totalMiles: Math.round(totalMiles),
      totalIncome: parseFloat(totalIncome.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      fixedMonthlyCost: parseFloat(fixedMonthlyCost.toFixed(2)),
      perMileFixed: parseFloat(perMileFixed.toFixed(4)),
      costPerMile,
      revenuePerMile,
      netPerMile,
      breakEvenMilesPerMonth,
      milesPerMonth: Math.round(milesPerMonth),
    });
  } catch (err) {
    console.error("Analysis error:", err);
    res.status(500).json({ error: "Failed to compute analysis" });
  }
});

export default router;
