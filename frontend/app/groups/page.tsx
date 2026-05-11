"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  GroupInvite,
  GroupSummary,
  createGroup,
  getGroups,
  getReceivedGroupInvites,
  respondToGroupInvite,
} from "../../lib/api";
import { clearAccessToken, getAccessToken } from "../../lib/auth";
import { NotificationBell } from "../../components/notification-bell";

export default function GroupsPage() {
  const PAGE_SIZE = 12;
  const router = useRouter();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/");
      return;
    }
    void loadGroups();
  }, [router]);

  async function loadGroups() {
    setLoading(true);
    setError(null);
    try {
      const [nextGroups, nextInvites] = await Promise.all([getGroups(), getReceivedGroupInvites()]);
      setGroups(nextGroups);
      setInvites(nextInvites);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load groups.";
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

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
      });
      setGroups((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
      setVisibleCount(PAGE_SIZE);
      setName("");
      setDescription("");
      setVisibility("public");
      setSuccess("Group created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group.");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter((group) =>
      [group.name, group.description, group.owner?.fullName, group.owner?.username]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [groups, search]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search]);

  const visibleGroups = useMemo(
    () => filteredGroups.slice(0, visibleCount),
    [filteredGroups, visibleCount],
  );

  const publicCount = useMemo(
    () => groups.filter((group) => (group.visibility ?? "public") === "public").length,
    [groups],
  );

  function logout() {
    clearAccessToken();
    router.replace("/");
  }

  async function onRespondInvite(inviteId: string, action: "accept" | "reject") {
    setInviteActionId(`${inviteId}:${action}`);
    setError(null);
    try {
      await respondToGroupInvite(inviteId, action);
      await loadGroups();
      setSuccess(action === "accept" ? "Invite accepted." : "Invite rejected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite action failed.");
    } finally {
      setInviteActionId(null);
    }
  }

  return (
    <main className="isu-dashboard-scene relative min-h-screen overflow-x-hidden text-slate-100">
      <div className="isu-soft-pattern pointer-events-none absolute inset-0" />
      <div className="isu-orb left-[-7rem] top-12 h-72 w-72 opacity-65" />
      <div className="isu-orb bottom-[-10rem] right-[-5rem] h-96 w-96 opacity-55" />
      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-5 lg:px-6">
        <header className="isu-topbar relative mb-5 overflow-hidden rounded-[1.75rem] px-5 py-5">
          <div className="isu-sheen" />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.34em] text-[#7fb7dc]">Community Layer</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Build focused spaces around classes, clubs, and projects.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--isu-text-soft)] sm:text-base">
                  Organize private study rooms, public communities, and invite-only circles without
                  burying people under clutter.
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
                <Link href="/materials" className="isu-chip rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">
                  Materials
                </Link>
                <Link href="/search" className="isu-chip rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">
                  Search
                </Link>
                <Link href="/groups" className="isu-button-primary rounded-full px-4 py-2 text-sm font-medium">
                  Groups
                </Link>
                <Link href="/friends" className="isu-chip rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">
                  Friends
                </Link>
              </nav>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Active groups</p>
                <p className="mt-3 text-3xl font-semibold text-white">{groups.length}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">All spaces currently visible to your school.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Pending invites</p>
                <p className="mt-3 text-3xl font-semibold text-white">{invites.length}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Join requests waiting for your response.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Public rooms</p>
                <p className="mt-3 text-3xl font-semibold text-white">{publicCount}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Open communities discoverable by anyone in campus.</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[360px,1fr]">
          <form onSubmit={onCreate} className="isu-panel rounded-[1.75rem] p-5">
            <div className="mb-5">
              <p className="text-xs uppercase tracking-[0.28em] text-[#7fb7dc]">Launch new room</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Create a group</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--isu-text-soft)]">
                Start a student club, private team, or open community with a cleaner first impression.
              </p>
            </div>

            <label className="mb-4 block">
              <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="isu-input w-full rounded-2xl px-4 py-3 text-sm"
                placeholder="Design critique circle"
              />
            </label>

            <label className="mb-4 block">
              <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="isu-input w-full rounded-2xl px-4 py-3 text-sm"
                placeholder="A short context so people know what this room is for."
              />
            </label>

            <label className="mb-5 block">
              <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Visibility</span>
              <select
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as "public" | "private")}
                className="isu-input w-full rounded-2xl bg-[rgba(8,19,29,0.94)] px-4 py-3 text-sm text-slate-100"
              >
                <option value="public" className="bg-[#0b1722] text-slate-100">Public</option>
                <option value="private" className="bg-[#0b1722] text-slate-100">Private</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="isu-button-primary w-full rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-70"
            >
              {submitting ? "Creating..." : "Create Group"}
            </button>

            {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
            {success ? <p className="mt-4 text-sm text-emerald-400">{success}</p> : null}
          </form>

          <section className="space-y-5">
            {invites.length > 0 ? (
              <div className="isu-panel rounded-[1.75rem] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Invites</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">Pending group invites</h3>
                  </div>
                  <span className="isu-chip rounded-full px-3 py-1 text-xs text-slate-200">
                    {invites.length} waiting
                  </span>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="rounded-[1.4rem] border border-[rgba(127,183,220,0.14)] bg-[rgba(8,19,29,0.72)] p-4"
                    >
                      <p className="text-base font-semibold text-white">{invite.group.name}</p>
                      <p className="mt-2 text-sm text-[var(--isu-text-soft)]">
                        {invite.group.description || "No description provided yet."}
                      </p>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                        Invited by {invite.inviter.fullName || invite.inviter.username || "Unknown user"}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void onRespondInvite(invite.id, "accept")}
                          disabled={inviteActionId === `${invite.id}:accept`}
                          className="rounded-full border border-emerald-700 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-900/30 disabled:opacity-70"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => void onRespondInvite(invite.id, "reject")}
                          disabled={inviteActionId === `${invite.id}:reject`}
                          className="rounded-full border border-rose-700 px-4 py-2 text-sm text-rose-300 hover:bg-rose-900/30 disabled:opacity-70"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <section className="isu-panel rounded-[1.75rem] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-xl">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Explore</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Groups directory</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--isu-text-soft)]">
                    Browse school groups, open the related room, and move between communities without a heavy dashboard.
                  </p>
                </div>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search groups, owners, or descriptions..."
                  className="isu-input w-full rounded-2xl px-4 py-3 text-sm lg:max-w-sm"
                />
              </div>

              {loading ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`group-skeleton-${index}`}
                      className="animate-pulse rounded-[1.5rem] border border-[rgba(127,183,220,0.12)] bg-[rgba(8,19,29,0.72)] p-4"
                    >
                      <div className="h-4 w-24 rounded bg-slate-800" />
                      <div className="mt-4 h-5 w-2/3 rounded bg-slate-800" />
                      <div className="mt-3 h-3 w-full rounded bg-slate-800" />
                    </div>
                  ))}
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="mt-5 rounded-[1.5rem] border border-dashed border-[rgba(127,183,220,0.16)] bg-[rgba(8,19,29,0.4)] px-5 py-12 text-center">
                  <p className="text-base font-medium text-slate-200">No groups found</p>
                  <p className="mt-2 text-sm text-[var(--isu-text-soft)]">
                    Try a different keyword or create the first room for this topic.
                  </p>
                </div>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {visibleGroups.map((group) => (
                    <Link
                      key={group.id}
                      href={`/groups/${group.id}`}
                      className="group rounded-[1.5rem] border border-[rgba(127,183,220,0.14)] bg-[linear-gradient(180deg,rgba(12,28,41,0.96),rgba(8,19,29,0.92))] p-4 transition hover:border-[rgba(127,183,220,0.32)] hover:shadow-[0_20px_50px_rgba(4,10,16,0.28)]"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="isu-chip rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">
                          {group.visibility ?? "public"}
                        </span>
                        <span className="text-xs text-slate-500">{group.memberCount ?? 0} members</span>
                      </div>

                      <h3 className="text-lg font-semibold text-white transition group-hover:text-[#bde4ff]">
                        {group.name}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-[var(--isu-text-soft)]">
                        {group.description || "No description yet. Open the room to see the latest conversation."}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span>Owner: {group.owner?.fullName || group.owner?.username || "Unknown"}</span>
                        <span>Open room</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {filteredGroups.length > visibleGroups.length ? (
                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    className="isu-chip rounded-full px-5 py-2 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)]"
                  >
                    Load more groups
                  </button>
                </div>
              ) : null}
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}
