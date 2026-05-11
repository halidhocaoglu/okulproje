"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  deleteGroup,
  GroupDetail,
  UserProfile,
  getCurrentUser,
  getGroupById,
  inviteGroupMember,
  searchSchoolUsers,
} from "../../../lib/api";
import { clearAccessToken, getAccessToken } from "../../../lib/auth";
import { NotificationBell } from "../../../components/notification-bell";

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [viewer, setViewer] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState<UserProfile[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/");
      return;
    }

    void loadGroup();
  }, [params.id, router]);

  async function loadGroup() {
    setLoading(true);
    setError(null);
    try {
      const [nextGroup, me] = await Promise.all([getGroupById(params.id), getCurrentUser()]);
      setGroup(nextGroup);
      setViewer(me);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load group.";
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

  async function runInviteSearch() {
    if (!inviteQuery.trim()) {
      setInviteResults([]);
      return;
    }
    setInviteLoading(true);
    try {
      const results = await searchSchoolUsers(inviteQuery.trim());
      const memberIds = new Set(group?.members?.map((member) => member.id) ?? []);
      setInviteResults(results.filter((user) => user.id !== viewer?.id && !memberIds.has(user.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search users.");
    } finally {
      setInviteLoading(false);
    }
  }

  async function onInvite(userId: string) {
    if (!group) return;
    setInvitingUserId(userId);
    setError(null);
    try {
      await inviteGroupMember(group.id, userId);
      setInviteQuery("");
      setInviteResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite user.");
    } finally {
      setInvitingUserId(null);
    }
  }

  async function onDeleteGroup() {
    if (!group) return;

    setDeleteLoading(true);
    setError(null);
    try {
      await deleteGroup(group.id);
      router.replace("/groups?deleted=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group.");
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  function logout() {
    clearAccessToken();
    router.replace("/");
  }

  const canInvite =
    Boolean(viewer?.id) &&
    Boolean(group?.owner?.id) &&
    (viewer?.id === group?.owner?.id ||
      group?.members?.some(
        (member) => member.id === viewer?.id && ["owner", "admin"].includes(member.roomRole ?? ""),
      ));
  const canDeleteGroup = canInvite;

  const statMembers = group?.memberCount ?? group?.members?.length ?? 0;
  const roleBreakdown = useMemo(() => {
    const counts = { owner: 0, admin: 0, member: 0 };
    for (const member of group?.members ?? []) {
      const role = member.roomRole ?? "member";
      if (role === "owner") counts.owner += 1;
      else if (role === "admin") counts.admin += 1;
      else counts.member += 1;
    }
    return counts;
  }, [group?.members]);

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
                <p className="text-xs uppercase tracking-[0.34em] text-[#7fb7dc]">Group detail</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {group?.name ?? "Group workspace"}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--isu-text-soft)] sm:text-base">
                  {group?.description || "A clearer view of members, invites, and the linked chat room."}
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
              <nav className="flex flex-wrap gap-2 rounded-[1.4rem] border border-[rgba(127,183,220,0.14)] bg-[rgba(7,17,27,0.4)] p-2 text-sm">
                <Link href="/chat" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Chat</Link>
                <Link href="/groups" className="isu-button-primary rounded-full px-4 py-2 font-medium">Groups</Link>
                <Link href="/friends" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Friends</Link>
                <Link href="/search" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Search</Link>
              </nav>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Members</p>
                <p className="mt-3 text-3xl font-semibold text-white">{statMembers}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Active people currently inside this group.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Admins</p>
                <p className="mt-3 text-3xl font-semibold text-white">{roleBreakdown.owner + roleBreakdown.admin}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Owners and admins who can manage access.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Visibility</p>
                <p className="mt-3 text-xl font-semibold uppercase text-white">{group?.visibility ?? "public"}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">How discoverable this group is on campus.</p>
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <p className="text-sm text-slate-400">Loading group...</p>
        ) : error ? (
          <p className="rounded-2xl border border-rose-800/50 bg-rose-950/20 px-4 py-3 text-sm text-rose-300">{error}</p>
        ) : !group ? (
          <p className="text-sm text-slate-400">Group not found.</p>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
            <section className="space-y-5">
              <div className="isu-panel rounded-[1.75rem] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Overview</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Group information</h2>
                  </div>
                  <span className="isu-chip rounded-full px-3 py-1 text-xs uppercase text-slate-200">
                    Owner: {group.owner?.fullName || group.owner?.username || "Unknown"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="isu-subtle-card rounded-[1.4rem] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Owners</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{roleBreakdown.owner}</p>
                  </div>
                  <div className="isu-subtle-card rounded-[1.4rem] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Admins</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{roleBreakdown.admin}</p>
                  </div>
                  <div className="isu-subtle-card rounded-[1.4rem] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Members</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{roleBreakdown.member}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  {group.roomId ? (
                    <button
                      onClick={() => router.push(`/chat?roomId=${group.roomId}`)}
                      className="isu-button-primary rounded-2xl px-5 py-3 text-sm font-semibold"
                    >
                      Open Group Chat
                    </button>
                  ) : (
                    <p className="py-3 text-sm text-slate-500">No linked chat room yet.</p>
                  )}
                  {canDeleteGroup ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/18"
                    >
                      Delete Group
                    </button>
                  ) : null}
                </div>
              </div>

              <section className="isu-panel rounded-[1.75rem] p-5">
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">People</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Members</h2>
                </div>
                {!group.members?.length ? (
                  <p className="rounded-[1.4rem] border border-dashed border-[rgba(127,183,220,0.16)] bg-[rgba(8,19,29,0.38)] px-4 py-6 text-sm text-[var(--isu-text-soft)]">
                    No active members listed.
                  </p>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {group.members.map((member) => (
                      <Link
                        key={member.id}
                        href={`/users/${member.id}`}
                        className="rounded-[1.4rem] border border-[rgba(127,183,220,0.14)] bg-[rgba(8,19,29,0.72)] p-4 transition hover:border-[rgba(127,183,220,0.32)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-white">
                              {member.fullName || member.username || member.email}
                            </p>
                            <p className="mt-1 text-sm text-[var(--isu-text-soft)]">
                              {member.username ? `@${member.username}` : member.email}
                            </p>
                          </div>
                          <span className="isu-chip rounded-full px-3 py-1 text-[11px] uppercase text-slate-200">
                            {member.roomRole || "member"}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </section>

            <section className="space-y-5">
              {canInvite ? (
                <section className="isu-panel rounded-[1.75rem] p-5">
                  <div className="mb-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Access</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Invite members</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--isu-text-soft)]">
                      Search by name or email and send a cleaner invitation into the group.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <input
                      value={inviteQuery}
                      onChange={(event) => setInviteQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void runInviteSearch();
                        }
                      }}
                      placeholder="Search users by name or email..."
                      className="isu-input w-full rounded-2xl px-4 py-3 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void runInviteSearch()}
                      className="isu-button-primary rounded-2xl px-4 py-3 text-sm font-semibold"
                    >
                      Search members
                    </button>
                  </div>

                  {inviteLoading ? <p className="mt-4 text-sm text-slate-400">Searching users...</p> : null}

                  <div className="mt-4 space-y-3">
                    {inviteResults.map((user) => (
                      <div key={user.id} className="rounded-[1.4rem] border border-[rgba(127,183,220,0.14)] bg-[rgba(8,19,29,0.72)] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-white">{user.fullName}</p>
                            <p className="mt-1 text-sm text-[var(--isu-text-soft)]">
                              {user.username ? `@${user.username} · ` : ""}
                              {user.email}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void onInvite(user.id)}
                            disabled={invitingUserId === user.id}
                            className="isu-button-primary rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60"
                          >
                            {invitingUserId === user.id ? "Inviting..." : "Invite"}
                          </button>
                        </div>
                      </div>
                    ))}
                    {!inviteLoading && inviteQuery.trim() && inviteResults.length === 0 ? (
                      <p className="text-sm text-slate-500">No eligible users matched your search.</p>
                    ) : null}
                  </div>
                </section>
              ) : null}

              <section className="isu-panel rounded-[1.75rem] p-5">
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Quick notes</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">How this space works</h2>
                </div>
                <div className="space-y-3 text-sm leading-6 text-[var(--isu-text-soft)]">
                  <p>Private groups keep discovery tighter while still allowing direct invites from owners and admins.</p>
                  <p>Public groups stay easier to browse and are better for open communities and subject-based hubs.</p>
                  <p>Member roles update the invite controls and management actions inside the linked group room.</p>
                </div>
              </section>
            </section>
          </div>
        )}
      </div>

      {showDeleteConfirm && group ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(3,9,16,0.72)] px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] border border-[rgba(127,183,220,0.16)] bg-[linear-gradient(180deg,rgba(17,34,52,0.97),rgba(7,16,26,0.97))] p-6 shadow-[0_32px_90px_rgba(2,10,18,0.55)]">
            <p className="text-xs uppercase tracking-[0.3em] text-rose-300">Delete group</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Remove {group.name}?</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--isu-text-soft)]">
              This will archive the linked room, deactivate members inside the group, and cancel any pending invites.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
                className="isu-chip rounded-2xl px-4 py-3 text-sm text-slate-200 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onDeleteGroup()}
                disabled={deleteLoading}
                className="rounded-2xl border border-rose-500/30 bg-rose-500/16 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/24 disabled:opacity-60"
              >
                {deleteLoading ? "Deleting..." : "Delete group"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
