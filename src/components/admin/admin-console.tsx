"use client";

import { Loader2, LogIn, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type AdminUser = {
  id: string;
  email?: string;
  createdAt?: string;
  lastSignInAt?: string;
  profile?: {
    display_name?: string | null;
    target_level?: string | null;
    goal?: string | null;
    is_active?: boolean | null;
    created_at?: string | null;
    deactivated_at?: string | null;
  } | null;
};

type ApiError = {
  error?: string;
};

export function AdminConsole({ authenticated }: { authenticated: boolean }) {
  const [isAuthenticated, setIsAuthenticated] = useState(authenticated);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      void loadUsers();
    }
  }, [isAuthenticated]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = (await response.json()) as { authenticated?: boolean } & ApiError;

      if (!response.ok || !data.authenticated) {
        throw new Error(data.error || "Admin login failed.");
      }

      setIsAuthenticated(true);
      setAdminPassword("");
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Admin login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAuthenticated(false);
    setUsers([]);
  }

  async function loadUsers() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/users");
      const data = (await response.json()) as { users?: AdminUser[] } & ApiError;

      if (!response.ok || !data.users) {
        throw new Error(data.error || "Could not load users.");
      }

      setUsers(data.users);
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          displayName: newName,
        }),
      });
      const data = (await response.json()) as { created?: boolean } & ApiError;

      if (!response.ok || !data.created) {
        throw new Error(data.error || "Could not create user.");
      }

      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setMessage("User created.");
      await loadUsers();
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Could not create user.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(user: AdminUser) {
    const confirmed = window.confirm(`Delete ${user.email || user.id}? This removes the auth user.`);

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/users?userId=${encodeURIComponent(user.id)}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { deleted?: boolean } & ApiError;

      if (!response.ok || !data.deleted) {
        throw new Error(data.error || "Could not delete user.");
      }

      setMessage("User deleted.");
      await loadUsers();
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Could not delete user.");
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
          Private admin
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-normal">
          Login to manage beta users
        </h2>
        <form onSubmit={login} className="mt-5 grid gap-3">
          <input
            type="email"
            value={adminEmail}
            onChange={(event) => setAdminEmail(event.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Admin email"
            required
          />
          <input
            type="password"
            value={adminPassword}
            onChange={(event) => setAdminPassword(event.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Admin password"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Admin login
          </button>
        </form>
        {message ? <p className="mt-3 text-sm font-semibold text-rose-700">{message}</p> : null}
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Admin console
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">
            Create, view, and delete beta users
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="rounded-md border border-neutral-300 p-2 hover:bg-neutral-50 disabled:opacity-60"
            aria-label="Refresh users"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
          >
            Logout
          </button>
        </div>
      </div>

      <form onSubmit={createUser} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <input
          type="email"
          value={newEmail}
          onChange={(event) => setNewEmail(event.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          placeholder="New user email"
          required
        />
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          placeholder="Display name"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          placeholder="Password"
          required
          minLength={6}
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Create
        </button>
      </form>

      {message ? <p className="mt-3 text-sm font-semibold text-neutral-700">{message}</p> : null}

      <div className="mt-5 overflow-hidden rounded-lg border border-neutral-200">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-neutral-200">
                <td className="px-4 py-3">
                  <p className="font-semibold">{user.profile?.display_name || user.email}</p>
                  <p className="mt-1 text-xs text-neutral-500">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                    {user.profile?.is_active === false ? "deactivated" : "active"}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "--"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => deleteUser(user)}
                    className="inline-flex items-center gap-2 rounded-md border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!users.length ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                  No users loaded.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
