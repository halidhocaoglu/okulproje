"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminToolsOverview, AuditLogEvent, UserProfile, getAdminToolsOverview, getAuditLogs, getCurrentUser } from "../../../lib/api";
import { clearAccessToken, getAccessToken } from "../../../lib/auth";
import { NotificationBell } from "../../../components/notification-bell";

function canAccessAdmin(role?: string) {
  return role === "school_admin" || role === "moderator";
}

export default function AdminToolsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [overview, setOverview] = useState<AdminToolsOverview | null>(null);
  const [logs, setLogs] = useState<AuditLogEvent[]>([]);
  const [loading, setLoading] = useState(true);
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

      const [overviewData, logData] = await Promise.all([getAdminToolsOverview(), getAuditLogs(40)]);
      setOverview(overviewData);
      setLogs(logData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load admin tools.";
      if (message.includes("401") || message.includes("Unauthorized") || message.includes("NO_TOKEN")) {
        clearAccessToken();
        router.replace("/");
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearAccessToken();
    router.replace("/");
  }

  if (!loading && profile && !canAccessAdmin(profile.role)) {
    return (
      <main className="isu-dashboard-scene min-h-screen px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-2xl rounded-[1.75rem] border border-[rgba(127,183,220,0.16)] bg-[rgba(12,28,41,0.9)] p-6 text-center shadow-[0_20px_70px_rgba(4,10,16,0.34)]">
          <h1 className="text-xl font-semibold">Admin Access Required</h1>
          <p className="mt-2 text-sm text-slate-400">This page is restricted to moderators and school admins.</p>
          <Link href="/chat" className="isu-button-primary mt-4 inline-flex rounded-full px-5 py-3 text-sm font-medium">
            Back to chat
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="isu-dashboard-scene relative min-h-screen overflow-x-hidden text-slate-100">
      <div className="isu-soft-pattern pointer-events-none absolute inset-0" />
      <div className="isu-orb left-[-8rem] top-10 h-72 w-72 opacity-60" />
      <div className="isu-orb bottom-[-10rem] right-[-5rem] h-96 w-96 opacity-52" />
      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-5 lg:px-6">
        <header className="isu-topbar relative mb-5 overflow-hidden rounded-[1.75rem] px-5 py-5">
          <div className="isu-sheen" />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.34em] text-[#7fb7dc]">Admin tools</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Watch registrations, reports, uploads, and audit events from one clean control surface.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--isu-text-soft)] sm:text-base">
                  This screen now behaves more like an operations dashboard and less like stacked utility blocks.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start">
                <NotificationBell />
                <button
                  onClick={logout}
                  className="isu-chip rounded-2xl px-4 py-2 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)]"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr,1fr,1fr,1fr]">
              <div className="flex flex-wrap gap-2 rounded-[1.4rem] border border-[rgba(127,183,220,0.14)] bg-[rgba(7,17,27,0.4)] p-2 text-sm">
                <Link href="/chat" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Chat</Link>
                <Link href="/admin" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Moderation</Link>
                <Link href="/admin/tools" className="isu-button-primary rounded-full px-4 py-2 font-medium">Admin Tools</Link>
                <Link href="/groups" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Groups</Link>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Registrations</p>
                <p className="mt-3 text-3xl font-semibold text-white">{overview?.recentRegistrations.length ?? 0}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Latest accounts shown in the overview feed.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Reports</p>
                <p className="mt-3 text-3xl font-semibold text-white">{overview?.recentReports.length ?? 0}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Recent moderation reports at a glance.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Audit events</p>
                <p className="mt-3 text-3xl font-semibold text-white">{logs.length}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Most recent backend actions captured.</p>
              </div>
            </div>
          </div>
        </header>

        {loading ? <p className="text-sm text-slate-400">Loading admin tools...</p> : null}
        {error ? <p className="rounded-2xl border border-rose-800/50 bg-rose-950/20 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

        {!loading && !error && overview ? (
          <div className="space-y-5">
            <section className="grid gap-4 xl:grid-cols-3">
              <section className="isu-panel rounded-[1.75rem] p-5">
                <h2 className="text-lg font-semibold text-white">Recent registrations</h2>
                <div className="mt-4 space-y-3">
                  {overview.recentRegistrations.map((item) => (
                    <div key={item.id} className="rounded-[1.4rem] border border-[rgba(127,183,220,0.14)] bg-[rgba(8,19,29,0.72)] p-4">
                      <p className="font-semibold text-white">{item.fullName}</p>
                      <p className="mt-1 text-sm text-[var(--isu-text-soft)]">{item.email}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{item.role}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="isu-panel rounded-[1.75rem] p-5">
                <h2 className="text-lg font-semibold text-white">Recent reports</h2>
                <div className="mt-4 space-y-3">
                  {overview.recentReports.map((item) => (
                    <div key={item.id} className="rounded-[1.4rem] border border-[rgba(127,183,220,0.14)] bg-[rgba(8,19,29,0.72)] p-4">
                      <p className="font-semibold text-white">{item.referenceType} report</p>
                      <p className="mt-1 text-sm text-[var(--isu-text-soft)]">{item.status}</p>
                      <p className="mt-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="isu-panel rounded-[1.75rem] p-5">
                <h2 className="text-lg font-semibold text-white">Recent uploads</h2>
                <div className="mt-4 space-y-3">
                  {overview.recentMaterialUploads.map((item) => (
                    <div key={item.id} className="rounded-[1.4rem] border border-[rgba(127,183,220,0.14)] bg-[rgba(8,19,29,0.72)] p-4">
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-[var(--isu-text-soft)]">{item.uploaderName}</p>
                      <p className="mt-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </section>
            </section>

            <section className="isu-panel rounded-[1.75rem] p-5">
              <h2 className="text-lg font-semibold text-white">Audit logs</h2>
              <div className="isu-scroll mt-4 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
                {logs.length === 0 ? (
                  <p className="text-sm text-slate-400">No audit events available.</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={`${log.actionType}-${log.occurredAt}-${index}`} className="rounded-[1.4rem] border border-[rgba(127,183,220,0.14)] bg-[rgba(8,19,29,0.72)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-white">{log.actionType}</p>
                        <p className="text-xs text-slate-500">{new Date(log.occurredAt).toLocaleString()}</p>
                      </div>
                      <p className="mt-2 text-sm text-[var(--isu-text-soft)]">
                        {log.actorName || log.actorEmail || log.userId || "Unknown actor"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
