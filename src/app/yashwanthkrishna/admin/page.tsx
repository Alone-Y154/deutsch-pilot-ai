import { AdminConsole } from "@/components/admin/admin-console";
import { getAdminSession } from "@/lib/admin-auth";

export default async function YashwanthKrishnaAdminPage() {
  const adminSession = await getAdminSession();

  return (
    <main className="min-h-screen bg-[#f8faf9] px-6 py-10 text-neutral-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Hidden admin route
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            DeutschPilot beta user management
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
            This route is not linked from the public profile. Access still requires
            the admin credentials configured in environment variables.
          </p>
        </div>
        <AdminConsole authenticated={Boolean(adminSession)} />
      </div>
    </main>
  );
}
