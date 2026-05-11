"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

import { BlocksResponse, FollowsResponse, getBlocks, getFollows, unblockUser, unfollowUser } from "../../lib/api";
import { clearAccessToken, getAccessToken } from "../../lib/auth";
import { NotificationBell } from "../../components/notification-bell";

function SocialCard({
  title,
  subtitle,
  href,
  action,
}: {
  title: string;
  subtitle: string;
  href: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[1.4rem] border border-[rgba(127,183,220,0.14)] bg-[rgba(8,19,29,0.72)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href={href} className="min-w-0">
          <p className="truncate text-base font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm text-[var(--isu-text-soft)]">{subtitle}</p>
        </Link>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export default function FollowingPage() {
  const router = useRouter();
  const [follows, setFollows] = useState<FollowsResponse | null>(null);
  const [blocks, setBlocks] = useState<BlocksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/");
      return;
    }

    void loadData();
  }, [router]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [followsResponse, blocksResponse] = await Promise.all([getFollows(), getBlocks()]);
      setFollows(followsResponse);
      setBlocks(blocksResponse);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load follows.";
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

  async function onUnfollow(userId: string) {
    setActionLoading(`unfollow:${userId}`);
    setError(null);
    try {
      await unfollowUser(userId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unfollow failed.");
    } finally {
      setActionLoading(null);
    }
  }

  async function onUnblock(userId: string) {
    setActionLoading(`unblock:${userId}`);
    setError(null);
    try {
      await unblockUser(userId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unblock failed.");
    } finally {
      setActionLoading(null);
    }
  }

  function logout() {
    clearAccessToken();
    router.replace("/");
  }

  const following = follows?.following ?? [];
  const followers = follows?.followers ?? [];
  const blocked = blocks?.items ?? [];

  return (
    <main className="isu-dashboard-scene relative min-h-screen overflow-x-hidden text-slate-100">
      <div className="isu-soft-pattern pointer-events-none absolute inset-0" />
      <div className="isu-orb left-[-8rem] top-10 h-72 w-72 opacity-60" />
      <div className="isu-orb bottom-[-10rem] right-[-5rem] h-96 w-96 opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-5 lg:px-6">
        <header className="isu-topbar relative mb-5 overflow-hidden rounded-[1.75rem] px-5 py-5">
          <div className="isu-sheen" />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.34em] text-[#7fb7dc]">Network orbit</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Track who you follow, who follows back, and who stays blocked.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--isu-text-soft)] sm:text-base">
                  Separate your network into cleaner sections so mobile and desktop both read like a dashboard, not a stack of cramped lists.
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
                <Link href="/friends" className="isu-chip rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">
                  Friends
                </Link>
                <Link href="/following" className="isu-button-primary rounded-full px-4 py-2 text-sm font-medium">
                  Following
                </Link>
                <Link href="/groups" className="isu-chip rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">
                  Groups
                </Link>
              </nav>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Following</p>
                <p className="mt-3 text-3xl font-semibold text-white">{following.length}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">People you currently track.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Followers</p>
                <p className="mt-3 text-3xl font-semibold text-white">{followers.length}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Accounts that follow your updates.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Blocked</p>
                <p className="mt-3 text-3xl font-semibold text-white">{blocked.length}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Accounts currently restricted.</p>
              </div>
            </div>
          </div>
        </header>

        {error ? (
          <p className="mb-4 rounded-2xl border border-rose-800/50 bg-rose-950/20 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-4">
            <div className="isu-panel rounded-[1.75rem] p-5">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">You follow</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Following</h2>
              </div>
              {loading ? <p className="text-sm text-slate-400">Loading...</p> : null}
              {!loading && following.length === 0 ? (
                <p className="rounded-[1.4rem] border border-dashed border-[rgba(127,183,220,0.16)] bg-[rgba(8,19,29,0.38)] px-4 py-6 text-sm text-[var(--isu-text-soft)]">
                  You are not following anyone yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {following.map((item) => (
                    <SocialCard
                      key={item.user.id}
                      href={`/users/${item.user.id}`}
                      title={item.user.fullName}
                      subtitle={item.user.username ? `@${item.user.username}` : item.user.email}
                      action={
                        <button
                          onClick={() => onUnfollow(item.user.id)}
                          disabled={actionLoading === `unfollow:${item.user.id}`}
                          className="isu-chip rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)] disabled:opacity-70"
                        >
                          Unfollow
                        </button>
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="isu-panel rounded-[1.75rem] p-5">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Restricted</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Blocked users</h2>
              </div>
              {!loading && blocked.length === 0 ? (
                <p className="rounded-[1.4rem] border border-dashed border-[rgba(127,183,220,0.16)] bg-[rgba(8,19,29,0.38)] px-4 py-6 text-sm text-[var(--isu-text-soft)]">
                  No blocked users.
                </p>
              ) : (
                <div className="space-y-3">
                  {blocked.map((item) => (
                    <SocialCard
                      key={item.user.id}
                      href={`/users/${item.user.id}`}
                      title={item.user.fullName}
                      subtitle={item.user.username ? `@${item.user.username}` : item.user.email}
                      action={
                        <button
                          onClick={() => onUnblock(item.user.id)}
                          disabled={actionLoading === `unblock:${item.user.id}`}
                          className="rounded-full border border-amber-700 px-4 py-2 text-sm text-amber-300 hover:bg-amber-900/30 disabled:opacity-70"
                        >
                          Unblock
                        </button>
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="isu-panel rounded-[1.75rem] p-5">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Audience</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Followers</h2>
            </div>
            {loading ? <p className="text-sm text-slate-400">Loading...</p> : null}
            {!loading && followers.length === 0 ? (
              <p className="rounded-[1.4rem] border border-dashed border-[rgba(127,183,220,0.16)] bg-[rgba(8,19,29,0.38)] px-4 py-6 text-sm text-[var(--isu-text-soft)]">
                No followers yet.
              </p>
            ) : (
              <div className="space-y-3">
                {followers.map((item) => (
                  <SocialCard
                    key={item.user.id}
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
