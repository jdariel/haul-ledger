import { Router } from "express";
import { db, fuelEntriesTable, tripsTable, expensesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

const IFTA_TAX_RATES: Record<string, { name: string; rate: number }> = {
  AL: { name: "Alabama", rate: 0.210 },
  AZ: { name: "Arizona", rate: 0.260 },
  AR: { name: "Arkansas", rate: 0.285 },
  CA: { name: "California", rate: 0.827 },
  CO: { name: "Colorado", rate: 0.205 },
  CT: { name: "Connecticut", rate: 0.415 },
  DE: { name: "Delaware", rate: 0.220 },
  FL: { name: "Florida", rate: 0.354 },
  GA: { name: "Georgia", rate: 0.326 },
  ID: { name: "Idaho", rate: 0.320 },
  IL: { name: "Illinois", rate: 0.455 },
  IN: { name: "Indiana", rate: 0.550 },
  IA: { name: "Iowa", rate: 0.325 },
  KS: { name: "Kansas", rate: 0.260 },
  KY: { name: "Kentucky", rate: 0.245 },
  LA: { name: "Louisiana", rate: 0.200 },
  ME: { name: "Maine", rate: 0.310 },
  MD: { name: "Maryland", rate: 0.369 },
  MA: { name: "Massachusetts", rate: 0.210 },
  MI: { name: "Michigan", rate: 0.266 },
  MN: { name: "Minnesota", rate: 0.285 },
  MS: { name: "Mississippi", rate: 0.180 },
  MO: { name: "Missouri", rate: 0.190 },
  MT: { name: "Montana", rate: 0.278 },
  NE: { name: "Nebraska", rate: 0.282 },
  NV: { name: "Nevada", rate: 0.280 },
  NH: { name: "New Hampshire", rate: 0.222 },
  NJ: { name: "New Jersey", rate: 0.425 },
  NM: { name: "New Mexico", rate: 0.210 },
  NY: { name: "New York", rate: 0.471 },
  NC: { name: "North Carolina", rate: 0.363 },
  ND: { name: "North Dakota", rate: 0.230 },
  OH: { name: "Ohio", rate: 0.470 },
  OK: { name: "Oklahoma", rate: 0.190 },
  OR: { name: "Oregon", rate: 0.360 },
  PA: { name: "Pennsylvania", rate: 0.760 },
  RI: { name: "Rhode Island", rate: 0.340 },
  SC: { name: "South Carolina", rate: 0.235 },
  SD: { name: "South Dakota", rate: 0.280 },
  TN: { name: "Tennessee", rate: 0.270 },
  TX: { name: "Texas", rate: 0.200 },
  UT: { name: "Utah", rate: 0.315 },
  VT: { name: "Vermont", rate: 0.320 },
  VA: { name: "Virginia", rate: 0.275 },
  WA: { name: "Washington", rate: 0.376 },
  WV: { name: "West Virginia", rate: 0.354 },
  WI: { name: "Wisconsin", rate: 0.329 },
  WY: { name: "Wyoming", rate: 0.240 },
  AB: { name: "Alberta", rate: 0.130 },
  BC: { name: "British Columbia", rate: 0.150 },
  MB: { name: "Manitoba", rate: 0.143 },
  NB: { name: "New Brunswick", rate: 0.157 },
  NL: { name: "Newfoundland", rate: 0.165 },
  NS: { name: "Nova Scotia", rate: 0.154 },
  ON: { name: "Ontario", rate: 0.143 },
  QC: { name: "Quebec", rate: 0.202 },
  SK: { name: "Saskatchewan", rate: 0.150 },
};

function getQuarterBounds(quarter: number, year: number) {
  const starts = [
    new Date(year, 0, 1),
    new Date(year, 3, 1),
    new Date(year, 6, 1),
    new Date(year, 9, 1),
  ];
  const ends = [
    new Date(year, 2, 31, 23, 59, 59),
    new Date(year, 5, 30, 23, 59, 59),
    new Date(year, 8, 30, 23, 59, 59),
    new Date(year, 11, 31, 23, 59, 59),
  ];
  return { start: starts[quarter - 1], end: ends[quarter - 1] };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.id;
    const quarter = parseInt((req.query.quarter as string) || "1");
    const year = parseInt((req.query.year as string) || String(new Date().getFullYear()));
    const { start, end } = getQuarterBounds(quarter, year);

    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    const [trips, fuelEntries, fuelExpenses] = await Promise.all([
      db.select().from(tripsTable).where(eq(tripsTable.userId, uid)),
      db.select().from(fuelEntriesTable).where(eq(fuelEntriesTable.userId, uid)),
      db.select().from(expensesTable).where(eq(expensesTable.userId, uid)),
    ]);

    const filteredTrips = trips.filter((t) => t.date >= startStr && t.date <= endStr);
    const filteredFuel = fuelEntries.filter((f) => f.date >= startStr && f.date <= endStr);
    const filteredFuelExpenses = fuelExpenses.filter(
      (e) => e.category === "Fuel" && e.date >= startStr && e.date <= endStr && e.jurisdiction
    );

    const totalMiles = filteredTrips.reduce(
      (s, t) => s + (t.loadedMiles || 0) + (t.emptyMiles || 0),
      0
    );
    const totalGallons =
      filteredFuel.reduce((s, f) => s + f.gallons, 0) +
      filteredFuelExpenses.reduce((s, e) => s + (e.gallons || 0), 0);

    const fleetMpg = totalMiles > 0 && totalGallons > 0 ? totalMiles / totalGallons : 0;

    const jurisdictionData: Record<
      string,
      { miles: number; loadedMiles: number; emptyMiles: number; gallons: number }
    > = {};

    filteredTrips.forEach((t) => {
      const jur = (t.jurisdiction || "").toUpperCase().trim();
      if (!jur) return;
      if (!jurisdictionData[jur]) jurisdictionData[jur] = { miles: 0, loadedMiles: 0, emptyMiles: 0, gallons: 0 };
      jurisdictionData[jur].miles += (t.loadedMiles || 0) + (t.emptyMiles || 0);
      jurisdictionData[jur].loadedMiles += t.loadedMiles || 0;
      jurisdictionData[jur].emptyMiles += t.emptyMiles || 0;
    });

    filteredFuel.forEach((f) => {
      const jur = (f.jurisdiction || "").toUpperCase().trim();
      if (!jur) return;
      if (!jurisdictionData[jur]) jurisdictionData[jur] = { miles: 0, loadedMiles: 0, emptyMiles: 0, gallons: 0 };
      jurisdictionData[jur].gallons += f.gallons;
    });

    filteredFuelExpenses.forEach((e) => {
      const jur = (e.jurisdiction || "").toUpperCase().trim();
      if (!jur || !e.gallons) return;
      if (!jurisdictionData[jur]) jurisdictionData[jur] = { miles: 0, loadedMiles: 0, emptyMiles: 0, gallons: 0 };
      jurisdictionData[jur].gallons += e.gallons;
    });

    const jurisdictions = Object.entries(jurisdictionData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([code, data]) => {
        const taxInfo = IFTA_TAX_RATES[code];
        const gallonsConsumed = fleetMpg > 0 ? data.miles / fleetMpg : 0;
        const netTaxableGallons = gallonsConsumed - data.gallons;
        const taxRate = taxInfo?.rate ?? 0;
        const taxDue = netTaxableGallons * taxRate;
        return {
          code,
          name: taxInfo?.name ?? code,
          totalMiles: data.miles,
          taxableMiles: data.loadedMiles,
          gallonsPurchased: data.gallons,
          gallonsConsumed,
          netTaxableGallons,
          taxRate,
          taxDue,
        };
      });

    const totalTaxDue = jurisdictions.reduce((s, j) => s + j.taxDue, 0);

    res.json({
      quarter,
      year,
      period: `Q${quarter} ${year}`,
      totalMiles,
      totalGallons,
      fleetMpg,
      totalTaxDue,
      jurisdictions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to compute IFTA report" });
  }
});

export default router;
