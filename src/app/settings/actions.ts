"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { user } from "@/db/schema";
import { getSiteRole } from "@/lib/site-role";

export type OwnerResult = {
  status: "success" | "error";
  message: string;
};

export async function assignOwner(formData: FormData): Promise<OwnerResult> {
  if ((await getSiteRole()) !== "admin") {
    return { status: "error", message: "Only an admin can change the site owner." };
  }

  const ownerId = formData.get("ownerId");
  if (
    typeof ownerId !== "string" ||
    !ownerId ||
    ownerId.length > 128 ||
    formData.getAll("ownerId").length !== 1
  ) {
    return { status: "error", message: "Choose an existing account for the owner." };
  }

  try {
    await db.batch([
      // Lock the eligible target for the whole transaction. A missing, banned,
      // or admin target makes the divisor zero, aborting the batch BEFORE any
      // demotion. Deletion/role changes cannot race the subsequent promotion.
      db.execute(sql`
        select 1 / count(*)::integer as valid_target
        from (
          select ${user.id} from ${user}
          where ${user.id} = ${ownerId}
            and (${user.role} in ('user', 'owner') or ${user.role} is null)
            and (${user.banned} = false or ${user.banned} is null)
          for update
        ) as eligible_target
      `),
      db.update(user).set({ role: "user" }).where(eq(user.role, "owner")),
      db.update(user).set({ role: "owner" }).where(eq(user.id, ownerId)),
    ]);
  } catch {
    // Neon batch is one transaction. A uniqueness/deadlock failure rolls back
    // both writes; do not fall back to separate Better Auth setRole requests.
    return {
      status: "error",
      message:
        "Could not change the owner. The account may be unavailable or another change conflicted. Refresh to check the current owner, then try again.",
    };
  }

  revalidatePath("/settings");
  return { status: "success", message: "Site owner updated." };
}
