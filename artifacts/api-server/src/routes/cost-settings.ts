import { Router } from "express";
import { eq, and, avg, sum, desc } from "drizzle-orm";
import {
  db, costSettingsTable, fuelEntriesTable, tripsTable,
  expensesTable, incomeTable,
} from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router = Router();

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

// POST /api/cost-settings
router.post("/", requireAuth, async (req, res) => {
  try {
    const { label, amount, frequency } = req.body;
    if (!label?.trim()) return res.status(400).json({ error: "Label is required" });
    if (!amount || isNaN(parseFloat(amount))) return res.status(400).json({ error: "Valid amount required" });
    const freq = frequency || "monthly";
    if (!["monthly", "weekly", "annual", "per_mile"].includes(freq))
      return res.status(400).json({ error: "Invalid frequency" });

    const [item] = await db
      .insert(costSettingsTable)
      .values({ userId: req.user!.id, label: label.trim(), amount: parseFloat(amount), frequency: freq })
      .returning();
    res.status(201).json(item);
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
    await db
      .delete(costSettingsTable)
      .where(and(eq(costSettingsTable.id, parseInt(req.params.id)), eq(costSettingsTable.userId, req.user!.id)));
    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete cost setting" });
  }
});

// GET /api/cost-settings/analysis — live metrics from real data
router.get("/analysis", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.id;

    // ── Fuel metrics ──────────────────────────────────────────────────────────
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

    // ── Miles metrics ─────────────────────────────────────────────────────────
    const tripRows = await db
      .select({
        loadedMiles: tripsTable.loadedMiles,
        emptyMiles: tripsTable.emptyMiles,
      })
      .from(tripsTable)
      .where(eq(tripsTable.userId, uid));

    const totalMiles = tripRows.reduce((acc, t) => acc + (t.loadedMiles ?? 0) + (t.emptyMiles ?? 0), 0);

    const truckMpg = totalGallons > 0 && totalMiles > 0
      ? parseFloat((totalMiles / totalGallons).toFixed(2))
      : 0;

    // ── Expense + Income totals ───────────────────────────────────────────────
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

    // ── Fixed costs → monthly equivalent ─────────────────────────────────────
    const costItems = await db
      .select()
      .from(costSettingsTable)
      .where(eq(costSettingsTable.userId, uid));

    const freqToMonthly: Record<string, number> = {
      monthly: 1,
      weekly: 52 / 12,
      annual: 1 / 12,
      per_mile: 0, // handled separately below
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

    // ── Derived metrics ───────────────────────────────────────────────────────
    // Estimate months of data from trips (rough: assume 12 months if insufficient data)
    const monthsOfData = tripRows.length > 0 ? Math.max(1, totalMiles / 10000) : 1;
    const milesPerMonth = totalMiles > 0 ? totalMiles / monthsOfData : 0;

    // Cost per mile: (total expenses including fuel) / total miles + per-mile fixed costs
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

    // Break-even: how many miles/month needed to cover fixed costs
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
