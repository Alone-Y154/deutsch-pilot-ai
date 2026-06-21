import Link from "next/link";

export default function AccountDeactivatedPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8faf9] px-6">
      <section className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-700">
          Account deactivated
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          This learner account cannot be reactivated
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          For safety, deactivation is permanent in this beta. You can join again only
          with a new approved beta account.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Back to home
        </Link>
      </section>
    </main>
  );
}
