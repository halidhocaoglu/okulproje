"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminManageUser,
  Department,
  ModerationReport,
  UserProfile,
  adminUpdateUser,
  getCurrentUser,
  getDepartments,
  getManageableUsers,
  getModerationReports,
  reviewModerationReport
} from "../../lib/api";
import { clearAccessToken, getAccessToken } from "../../lib/auth";
import { NotificationBell } from "../../components/notification-bell";

function canAccessAdmin(role?: string) {
  return role === "school_admin" || role === "moderator";
}

export default function AdminPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminManageUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [userLoading, setUserLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | "dismissed" | "">("open");
  const [typeFilter, setTypeFilter] = useState<"message" | "material" | "">("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/");
      return;
    }

    void bootstrap();
  }, [router]);

  async function bootstrap() {
    setLoading(true);
    setError(null);
    try {
      const me = await getCurrentUser();
      setProfile(me);
      if (!canAccessAdmin(me.role)) {
        setLoading(false);
        return;
      }
      await Promise.all([loadUsers(""), loadDepartments()]);
      await loadReports("open", "");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load admin panel.";
      if (message.includes("401") || message.includes("Unauthorized") || message.includes("NO_TOKEN")) {
        clearAccessToken();
        router.replace("/");
        return;
      }
      setError(message);
      setLoading(false);
    }
  }

  async function loadUsers(query: string) {
    setUserLoading(true);
    try {
      setUsers(await getManageableUsers(query));
    } finally {
      setUserLoading(false);
    }
  }

  async function loadDepartments() {
    setDepartments(await getDepartments());
  }

  async function loadReports(
    nextStatus: "open" | "resolved" | "dismissed" | "",
    nextType: "message" | "material" | ""
  ) {
    setLoading(true);
    setError(null);
    try {
      setReports(
        await getModerationReports({
          status: nextStatus || undefined,
          referenceType: nextType || undefined,
          limit: 50
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }

  async function onReview(reportId: string, status: "resolved" | "dismissed") {
    setReviewingId(reportId);
    setError(null);
    try {
      const updated = await reviewModerationReport(reportId, { status });
      setReports((prev) => prev.map((report) => (report.id === reportId ? updated : report)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to review report.");
    } finally {
      setReviewingId(null);
    }
  }

  async function onUpdateUser(
    userId: string,
    payload: { role?: string; departmentId?: string; isActive?: boolean }
  ) {
    setSavingUserId(userId);
    setError(null);
    try {
      const updated = await adminUpdateUser(userId, payload);
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                role: updated.role ?? user.role,
                isActive: updated.isActive ?? user.isActive,
                departmentId: updated.department?.id ?? user.departmentId ?? null,
                department: updated.department ?? null
              }
            : user
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user.");
    } finally {
      setSavingUserId(null);
    }
  }

  const unsupportedUserReports = useMemo(
    () => reports.filter((report) => report.referenceType === "user").length === 0,
    [reports]
  );

  function logout() {
    clearAccessToken();
    router.replace("/");
  }

  if (!loading && profile && !canAccessAdmin(profile.role)) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
          <h1 className="text-xl font-semibold">Admin Access Required</h1>
          <p className="mt-2 text-sm text-slate-400">This panel is restricted to moderators and school admins.</p>
          <Link href="/chat" className="mt-4 inline-flex rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950">
            Back to chat
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-4 text-slate-100">
      <div className="isu-orb left-[-8rem] top-10 h-64 w-64 opacity-60" />
      <div className="isu-orb bottom-[-9rem] right-[-6rem] h-80 w-80 opacity-55" />
      <div className="relative mx-auto max-w-6xl">
        <header className="isu-panel relative mb-5 overflow-hidden rounded-[1.75rem] px-5 py-4">
          <div className="isu-sheen" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/chat" className="isu-chip px-3 py-1.5 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Chat</Link>
            <Link href="/admin" className="isu-button-primary rounded-full px-3 py-1.5 font-medium">Moderation</Link>
            <Link href="/admin/tools" className="isu-chip px-3 py-1.5 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Admin Tools</Link>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={logout} className="rounded-md border border-slate-700 px-3 py-1 text-sm hover:bg-slate-800">
              Logout
            </button>
          </div>
          </div>
        </header>

        <section className="isu-panel mb-4 rounded-[1.75rem] p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold">User management</h1>
              <p className="mt-1 text-sm text-[var(--isu-text-soft)]">
                Ban users, move them between departments, and adjust roles from one panel.
              </p>
            </div>
            <input
              value={userQuery}
              onChange={(event) => setUserQuery(event.target.value)}
              onBlur={() => void loadUsers(userQuery)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void loadUsers(userQuery);
                }
              }}
              placeholder="Search users..."
              className="isu-input w-full max-w-sm rounded-xl px-3 py-2 text-sm"
            />
          </div>
          {userLoading ? <p className="text-sm text-slate-400">Loading users...</p> : null}
          <div className="space-y-3">
            {users.map((user) => (
              <article
                key={user.id}
                className="rounded-[1.4rem] border border-[rgba(127,183,220,0.16)] bg-[linear-gradient(180deg,rgba(12,28,41,0.96),rgba(8,19,29,0.92))] p-4"
              >
                <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="font-semibold text-white">{user.fullName}</h2>
                    <p className="text-sm text-slate-400">
                      {user.username ? `@${user.username} · ` : ""}
                      {user.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="isu-chip px-2.5 py-1 text-slate-200">{user.role}</span>
                    <span className="isu-chip px-2.5 py-1 text-slate-200">
                      {user.isActive ? "Active" : "Banned"}
                    </span>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <select
                    value={user.role}
                    onChange={(event) =>
                      void onUpdateUser(user.id, { role: event.target.value })
                    }
                    disabled={savingUserId === user.id}
                    className="isu-input rounded-xl bg-[rgba(8,19,29,0.94)] px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="student" className="bg-[#0b1722] text-slate-100">Student</option>
                    <option value="moderator" className="bg-[#0b1722] text-slate-100">Moderator</option>
                    <option value="school_admin" className="bg-[#0b1722] text-slate-100">School admin</option>
                  </select>
                  <select
                    value={user.departmentId ?? ""}
                    onChange={(event) =>
                      void onUpdateUser(user.id, { departmentId: event.target.value })
                    }
                    disabled={savingUserId === user.id}
                    className="isu-input rounded-xl bg-[rgba(8,19,29,0.94)] px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="" className="bg-[#0b1722] text-slate-100">No department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id} className="bg-[#0b1722] text-slate-100">
                        {department.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void onUpdateUser(user.id, { isActive: !user.isActive })}
                    disabled={savingUserId === user.id}
                    className={`rounded-xl px-3 py-2 text-sm font-medium ${
                      user.isActive
                        ? "bg-rose-500 text-white hover:bg-rose-400"
                        : "isu-button-primary"
                    } disabled:opacity-60`}
                  >
                    {user.isActive ? "Ban user" : "Restore user"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="isu-panel rounded-[1.75rem] p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Moderation Panel</h1>
              <p className="mt-1 text-sm text-slate-400">Review reported messages and materials for your school.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(event) => {
                  const value = event.target.value as "open" | "resolved" | "dismissed" | "";
                  setStatusFilter(value);
                  void loadReports(value, typeFilter);
                }}
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="">All statuses</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
              <select
                value={typeFilter}
                onChange={(event) => {
                  const value = event.target.value as "message" | "material" | "";
                  setTypeFilter(value);
                  void loadReports(statusFilter, value);
                }}
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="">All types</option>
                <option value="message">Messages</option>
                <option value="material">Materials</option>
              </select>
            </div>
          </div>

          {error ? <p className="mb-3 text-sm text-rose-400">{error}</p> : null}
          {unsupportedUserReports ? (
            <p className="mb-3 text-xs text-slate-500">Reported users are not supported by the current backend schema.</p>
          ) : null}

          {loading ? (
            <p className="text-sm text-slate-400">Loading reports...</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-slate-400">No reports found for the current filters.</p>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <article key={report.id} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] uppercase text-slate-400">
                          {report.referenceType}
                        </span>
                        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] uppercase text-slate-400">
                          {report.status}
                        </span>
                      </div>
                      <h2 className="mt-2 font-medium">{report.subjectPreview || "No preview available"}</h2>
                      <p className="mt-2 text-sm text-slate-400">
                        Reason: {report.reason}
                        {report.description ? ` · ${report.description}` : ""}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Reporter: {report.reporter?.fullName || report.reporter?.username || report.reporterId}
                        {" · "}
                        Target: {report.targetUser?.fullName || report.targetUser?.username || "Unknown"}
                      </p>
                    </div>

                    {report.status === "open" || report.status === "under_review" ? (
                      <div className="flex gap-2">
                        <button
                          disabled={reviewingId === report.id}
                          onClick={() => void onReview(report.id, "dismissed")}
                          className="rounded-md border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-60"
                        >
                          Dismiss
                        </button>
                        <button
                          disabled={reviewingId === report.id}
                          onClick={() => void onReview(report.id, "resolved")}
                          className="rounded-md bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
                        >
                          Resolve
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Reviewed {report.reviewedAt ? new Date(report.reviewedAt).toLocaleString() : "recently"}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
