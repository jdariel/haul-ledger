import { db, incomeTable, tripsTable } from "@workspace/db";
import { eq, and, isNull, isNotNull, gt, sql } from "drizzle-orm";

function extractState(location: string): string | null {
  const match = location.trim().match(/,\s*([A-Z]{2})$/);
  return match ? match[1] : null;
}

export async function syncIncomeTrips() {
  try {
    console.log("[syncIncomeTrips] Starting income→trip sync…");

    // ── Step 1: back-link existing auto-logged trips that have no income_id ──
    // Match by: same user_id, notes = "Auto-logged from income: <source>"
    await db.execute(sql`
      UPDATE trips t
      SET income_id = i.id
      FROM income i
      WHERE t.income_id IS NULL
        AND t.user_id   = i.user_id
        AND t.notes     = 'Auto-logged from income: ' || i.source
    `);

    // ── Step 2: fix trips whose user_id is NULL but income_id is set ──
    await db.execute(sql`
      UPDATE trips t
      SET user_id = i.user_id
      FROM income i
      WHERE t.income_id = i.id
        AND t.user_id IS NULL
        AND i.user_id IS NOT NULL
    `);

    // ── Step 3: fix income entries whose user_id is NULL but have a linked trip ──
    await db.execute(sql`
      UPDATE income i
      SET user_id = t.user_id
      FROM trips t
      WHERE t.income_id = i.id
        AND i.user_id IS NULL
        AND t.user_id IS NOT NULL
    `);

    // ── Step 4: create missing trips for income entries that have no linked trip ──
    // Only process income entries that have pickup, delivery, and loaded_miles > 0
    const incomeNeedingTrips = await db
      .select()
      .from(incomeTable)
      .where(
        and(
          isNotNull(incomeTable.pickupLocation),
          isNotNull(incomeTable.deliveryLocation),
          isNotNull(incomeTable.loadedMiles),
          gt(incomeTable.loadedMiles, 0),
          isNotNull(incomeTable.userId),
          // Only rows that still have no linked trip
          sql`NOT EXISTS (
            SELECT 1 FROM trips WHERE trips.income_id = ${incomeTable.id}
          )`
        )
      );

    let created = 0;
    for (const entry of incomeNeedingTrips) {
      const jurisdiction =
        extractState(entry.deliveryLocation!) ??
        extractState(entry.pickupLocation!) ??
        null;
      const totalMiles = (entry.loadedMiles ?? 0) + (entry.emptyMiles ?? 0);

      await db.insert(tripsTable).values({
        userId: entry.userId!,
        incomeId: entry.id,
        date: entry.date,
        pickupLocation: entry.pickupLocation!,
        deliveryLocation: entry.deliveryLocation!,
        loadedMiles: entry.loadedMiles!,
        emptyMiles: entry.emptyMiles ?? 0,
        startOdometer: 0,
        endOdometer: Math.round(totalMiles),
        jurisdiction: jurisdiction ?? "N/A",
        notes: `Auto-logged from income: ${entry.source}`,
      });
      created++;
    }

    console.log(
      `[syncIncomeTrips] Done — linked existing trips, created ${created} new trip(s).`
    );
  } catch (err) {
    console.error("[syncIncomeTrips] Sync failed:", err);
  }
}
