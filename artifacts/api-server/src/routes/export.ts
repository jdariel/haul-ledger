import { Router } from "express";
import { db, expensesTable, incomeTable, fuelEntriesTable, tripsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

function escapeCSV(val: unknown): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toRow(obj: Record<string, unknown>, keys: string[]): string {
  return keys.map((k) => escapeCSV(obj[k])).join(",");
}

router.get("/csv", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.id;

    const [expenses, income, fuel, trips] = await Promise.all([
      db.select().from(expensesTable).where(eq(expensesTable.userId, uid)).orderBy(asc(expensesTable.date)),
      db.select().from(incomeTable).where(eq(incomeTable.userId, uid)).orderBy(asc(incomeTable.date)),
      db.select().from(fuelEntriesTable).where(eq(fuelEntriesTable.userId, uid)).orderBy(asc(fuelEntriesTable.date)),
      db.select().from(tripsTable).where(eq(tripsTable.userId, uid)).orderBy(asc(tripsTable.date)),
    ]);

    const lines: string[] = [
      `# HaulLedger Export — ${new Date().toISOString().split("T")[0]}`,
      "",
    ];

    const expenseKeys = ["date", "merchant", "category", "amount", "notes", "jurisdiction", "gallons", "pricePerGallon"];
    lines.push("EXPENSES");
    lines.push(expenseKeys.join(","));
    for (const row of expenses) lines.push(toRow(row as Record<string, unknown>, expenseKeys));
    lines.push("");

    const incomeKeys = ["date", "source", "amount", "pickupLocation", "deliveryLocation", "loadedMiles", "emptyMiles", "routeName", "trailerNumber", "notes"];
    lines.push("INCOME");
    lines.push(incomeKeys.join(","));
    for (const row of income) lines.push(toRow(row as Record<string, unknown>, incomeKeys));
    lines.push("");

    const fuelKeys = ["date", "vendor", "gallons", "pricePerGallon", "jurisdiction", "totalAmount"];
    lines.push("FUEL");
    lines.push(fuelKeys.join(","));
    for (const row of fuel) lines.push(toRow(row as Record<string, unknown>, fuelKeys));
    lines.push("");

    const tripKeys = ["date", "pickupLocation", "deliveryLocation", "startOdometer", "endOdometer", "loadedMiles", "emptyMiles", "jurisdiction", "notes"];
    lines.push("TRIPS");
    lines.push(tripKeys.join(","));
    for (const row of trips) lines.push(toRow(row as Record<string, unknown>, tripKeys));

    const today = new Date().toISOString().split("T")[0];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="haul-ledger-${today}.csv"`);
    res.send(lines.join("\n"));
  } catch {
    res.status(500).json({ error: "CSV export failed" });
  }
});

router.get("/json", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.id;

    const [expenses, income, fuel, trips] = await Promise.all([
      db.select().from(expensesTable).where(eq(expensesTable.userId, uid)).orderBy(asc(expensesTable.date)),
      db.select().from(incomeTable).where(eq(incomeTable.userId, uid)).orderBy(asc(incomeTable.date)),
      db.select().from(fuelEntriesTable).where(eq(fuelEntriesTable.userId, uid)).orderBy(asc(fuelEntriesTable.date)),
      db.select().from(tripsTable).where(eq(tripsTable.userId, uid)).orderBy(asc(tripsTable.date)),
    ]);

    const today = new Date().toISOString().split("T")[0];
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="haul-ledger-backup-${today}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      expenses,
      income,
      fuel,
      trips,
    });
  } catch {
    res.status(500).json({ error: "JSON export failed" });
  }
});

export default router;
