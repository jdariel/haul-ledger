import { Router } from "express";
import { db, expensesTable, incomeTable, tripsTable } from "@workspace/db";
import { desc, sum, gte, and, eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.id;
    const now = new Date();
    const period = (req.query.period as string) ?? "week";

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const periodStart = period === "month" ? startOfMonth : startOfWeek;
    const periodStr = periodStart.toISOString().split("T")[0];
    const weekStr = startOfWeek.toISOString().split("T")[0];

    const [incomeResult] = await db
      .select({ total: sum(incomeTable.amount) })
      .from(incomeTable)
      .where(and(eq(incomeTable.userId, uid), gte(incomeTable.date, periodStr)));

    const [expenseResult] = await db
      .select({ total: sum(expensesTable.amount) })
      .from(expensesTable)
      .where(and(eq(expensesTable.userId, uid), gte(expensesTable.date, periodStr)));

    const totalIncome = Number(incomeResult?.total ?? 0);
    const totalExpenses = Number(expenseResult?.total ?? 0);
    const netProfit = totalIncome - totalExpenses;

    const allTrips = await db
      .select()
      .from(tripsTable)
      .where(and(eq(tripsTable.userId, uid), gte(tripsTable.date, weekStr)));

    const weeklyMiles = allTrips.reduce(
      (sum, t) => sum + t.loadedMiles + t.emptyMiles,
      0
    );

    const recentExpenses = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.userId, uid))
      .orderBy(desc(expensesTable.date))
      .limit(3);

    const recentIncome = await db
      .select()
      .from(incomeTable)
      .where(eq(incomeTable.userId, uid))
      .orderBy(desc(incomeTable.date))
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
