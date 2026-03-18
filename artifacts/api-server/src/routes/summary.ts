import { Router } from "express";
import { db, expensesTable, incomeTable, tripsTable } from "@workspace/db";
import { desc, sum } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const weekStr = startOfWeek.toISOString().split("T")[0];

    const [incomeResult] = await db
      .select({ total: sum(incomeTable.amount) })
      .from(incomeTable);

    const [expenseResult] = await db
      .select({ total: sum(expensesTable.amount) })
      .from(expensesTable);

    const totalIncome = Number(incomeResult?.total ?? 0);
    const totalExpenses = Number(expenseResult?.total ?? 0);
    const netProfit = totalIncome - totalExpenses;

    const allTrips = await db.select().from(tripsTable);
    const weeklyMiles = allTrips
      .filter((t) => t.date >= weekStr)
      .reduce((sum, t) => sum + t.loadedMiles + t.emptyMiles, 0);

    const recentExpenses = await db
      .select()
      .from(expensesTable)
      .orderBy(desc(expensesTable.createdAt))
      .limit(3);

    const recentIncome = await db
      .select()
      .from(incomeTable)
      .orderBy(desc(incomeTable.createdAt))
      .limit(3);

    const activity = [
      ...recentExpenses.map((e) => ({
        id: e.id,
        type: "expense" as const,
        description: `${e.merchant} - ${e.category}`,
        amount: -e.amount,
        date: e.date,
      })),
      ...recentIncome.map((i) => ({
        id: i.id,
        type: "income" as const,
        description: i.source,
        amount: i.amount,
        date: i.date,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    res.json({
      totalIncome,
      totalExpenses,
      netProfit,
      weeklyMiles,
      mileageGoal: 2500,
      recentActivity: activity,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

export default router;
