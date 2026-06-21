import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const betaUserLimit = 15;

export type BetaStatus = {
  configured: boolean;
  limit: number;
  activeUsers: number | null;
  availableSlots: number | null;
  waitlistActive: boolean;
};

export async function getBetaStatus(): Promise<BetaStatus> {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return {
      configured: false,
      limit: betaUserLimit,
      activeUsers: null,
      availableSlots: null,
      waitlistActive: false,
    };
  }

  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    return {
      configured: true,
      limit: betaUserLimit,
      activeUsers: null,
      availableSlots: null,
      waitlistActive: false,
    };
  }

  const activeUsers = data.users.length;
  const availableSlots = Math.max(0, betaUserLimit - activeUsers);

  return {
    configured: true,
    limit: betaUserLimit,
    activeUsers,
    availableSlots,
    waitlistActive: availableSlots <= 0,
  };
}
