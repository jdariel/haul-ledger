import { eq, and } from "drizzle-orm";
import { db, fleetsTable, fleetMembersTable } from "@workspace/db";

/**
 * If forUserId is provided and different from requesterId, validates that:
 *  - requesterId is a fleet owner
 *  - forUserId is a member of that same fleet
 * Returns the effective userId to write data against, or throws.
 */
export async function resolveTargetUserId(
  requesterId: number,
  forUserId?: number
): Promise<number> {
  if (!forUserId || forUserId === requesterId) return requesterId;

  const [ownerFleet] = await db
    .select({ id: fleetsTable.id })
    .from(fleetsTable)
    .where(eq(fleetsTable.ownerId, requesterId))
    .limit(1);

  if (!ownerFleet) {
    throw Object.assign(new Error("Only fleet owners can add data for drivers."), { status: 403 });
  }

  const [membership] = await db
    .select({ id: fleetMembersTable.id })
    .from(fleetMembersTable)
    .where(
      and(
        eq(fleetMembersTable.fleetId, ownerFleet.id),
        eq(fleetMembersTable.userId, forUserId)
      )
    )
    .limit(1);

  if (!membership) {
    throw Object.assign(new Error("That driver is not in your fleet."), { status: 403 });
  }

  return forUserId;
}
