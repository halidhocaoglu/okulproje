"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

import { FriendsResponse, getFriends, respondToFriendRequest } from "../../lib/api";
import { clearAccessToken, getAccessToken } from "../../lib/auth";
import { NotificationBell } from "../../components/notification-bell";

function PersonCard({
  href,
  title,
  subtitle,
  trailing,
}: {
  href: string;
  title: string;
  subtitle: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="rounded-[1.4rem] border border-[rgba(127,183,220,0.14)] bg-[rgba(8,19,29,0.72)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href={href} className="min-w-0">
          <p className="truncate text-base font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm text-[var(--isu-text-soft)]">{subtitle}</p>
        </Link>
        {trailing ? <div className="flex shrink-0 flex-wrap gap-2">{trailing}</div> : null}
      </div>
    </div>
  );
}

export default function FriendsPage() {
  const router = useRouter();
  const [data, setData] = useState<FriendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/");
      return;
    }

    void loadFriends();
  }, [router]);

  async function loadFriends() {
    setLoading(true);
    setError(null);
    try {
      setData(await getFriends());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load friends.";
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

  async function onRespond(requestId: string, action: "accept" | "reject") {
    setActionLoading(`${requestId}:${action}`);
    setError(null);
    try {
      await respondToFriendRequest(requestId, action);
      await loadFriends();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Friend action failed.");
    } finally {
      setActionLoading(null);
    }
  }

  function logout() {
    clearAccessToken();
    router.replace("/");
  }

  const friends = data?.friends ?? [];
  const incoming = data?.incomingRequests ?? [];
  const outgoing = data?.outgoingRequests ?? [];

  return (
    <main className="isu-dashboard-scene relative min-h-screen overflow-x-hidden text-slate-100">
      <div className="isu-soft-pattern pointer-events-none absolute inset-0" />
      <div className="isu-orb left-[-7rem] top-16 h-72 w-72 opacity-60" />
      <div className="isu-orb bottom-[-9rem] right-[-4rem] h-80 w-80 opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-5 lg:px-6">
        <header className="isu-topbar relative mb-5 overflow-hidden rounded-[1.75rem] px-5 py-5">
          <div className="isu-sheen" />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.34em] text-[#7fb7dc]">Social graph</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Keep your circle visible without making the page feel busy.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--isu-text-soft)] sm:text-base">
                  Incoming requests, active friends, and outgoing invites now live in a cleaner three-panel layout.
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
              <nav className="flex flex-wrap gap-2 rounded-[1.4rem] border border-[rgba(127,183,220,0.14)] bg-[rgba(7,17,27,0.4)] p-2">
                <Link href="/chat" className="isu-chip rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">
                  Chat
                </Link>
                <Link href="/friends" className="isu-button-primary rounded-full px-4 py-2 text-sm font-medium">
                  Friends
                </Link>
                <Link href="/following" className="isu-chip rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">
                  Following
                </Link>
                <Link href="/groups" className="isu-chip rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">
                  Groups
                </Link>
              </nav>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Friends</p>
                <p className="mt-3 text-3xl font-semibold text-white">{friends.length}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">People already connected to your account.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Incoming</p>
                <p className="mt-3 text-3xl font-semibold text-white">{incoming.length}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Requests waiting for your response.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Outgoing</p>
                <p className="mt-3 text-3xl font-semibold text-white">{outgoing.length}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Invites you have already sent.</p>
              </div>
            </div>
          </div>
        </header>

        {error ? (
          <p className="mb-4 rounded-2xl border border-rose-800/50 bg-rose-950/20 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-3">
          <div className="isu-panel rounded-[1.75rem] p-5">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Connected</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Friends</h2>
            </div>
            {loading ? <p className="text-sm text-slate-400">Loading...</p> : null}
            {!loading && friends.length === 0 ? (
              <p className="rounded-[1.4rem] border border-dashed border-[rgba(127,183,220,0.16)] bg-[rgba(8,19,29,0.38)] px-4 py-6 text-sm text-[var(--isu-text-soft)]">
                No friends yet.
              </p>
            ) : (
              <div className="space-y-3">
                {friends.map((item) => (
                  <PersonCard
                    key={item.requestId}
                    href={`/users/${item.user.id}`}
                    title={item.user.fullName}
                    subtitle={item.user.username ? `@${item.user.username}` : item.user.email}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="isu-panel rounded-[1.75rem] p-5">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Action</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Incoming requests</h2>
            </div>
            {!loading && incoming.length === 0 ? (
              <p className="rounded-[1.4rem] border border-dashed border-[rgba(127,183,220,0.16)] bg-[rgba(8,19,29,0.38)] px-4 py-6 text-sm text-[var(--isu-text-soft)]">
                No incoming requests.
              </p>
            ) : (
              <div className="space-y-3">
                {incoming.map((item) => (
                  <PersonCard
                    key={item.requestId}
                    href={`/users/${item.user.id}`}
                    title={item.user.fullName}
                    subtitle={item.user.username ? `@${item.user.username}` : item.user.email}
                    trailing={
                      <>
                        <button
                          onClick={() => onRespond(item.requestId, "accept")}
                          disabled={actionLoading === `${item.requestId}:accept`}
                          className="rounded-full border border-emerald-700 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-900/30 disabled:opacity-70"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => onRespond(item.requestId, "reject")}
                          disabled={actionLoading === `${item.requestId}:reject`}
                          className="rounded-full border border-rose-700 px-4 py-2 text-sm text-rose-300 hover:bg-rose-900/30 disabled:opacity-70"
                        >
                          Reject
                        </button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <div className="isu-panel rounded-[1.75rem] p-5">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Queued</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Outgoing requests</h2>
            </div>
            {!loading && outgoing.length === 0 ? (
              <p className="rounded-[1.4rem] border border-dashed border-[rgba(127,183,220,0.16)] bg-[rgba(8,19,29,0.38)] px-4 py-6 text-sm text-[var(--isu-text-soft)]">
                No outgoing requests.
              </p>
            ) : (
              <div className="space-y-3">
                {outgoing.map((item) => (
                  <PersonCard
                    key={item.requestId}
                    href={`/users/${item.user.id}`}
                    title={item.user.fullName}
                    subtitle={item.user.username ? `@${item.user.username}` : item.user.email}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
