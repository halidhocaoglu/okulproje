"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GroupDetail, UserProfile, getCurrentUser, getGroupById, inviteGroupMember, searchSchoolUsers } from "../../../lib/api";
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

  function logout() {
    clearAccessToken();
    router.replace("/");
  }

  const canInvite =
    Boolean(viewer?.id) &&
    Boolean(group?.owner?.id) &&
    (viewer?.id === group?.owner?.id ||
      group?.members?.some(
        (member) => member.id === viewer?.id && ["owner", "admin"].includes(member.roomRole ?? "")
      ));

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-4 text-slate-100">
      <div className="mx-auto max-w-4xl">
        <header className="mb-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/chat" className="rounded-md px-2 py-1 hover:bg-slate-800">
              Chat
            </Link>
            <Link href="/groups" className="rounded-md bg-slate-800 px-2 py-1 text-cyan-300">
              Groups
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={logout}
              className="rounded-md border border-slate-700 px-3 py-1 text-sm hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </header>

        {loading ? (
          <p className="text-sm text-slate-400">Loading group...</p>
        ) : error ? (
          <p className="text-sm text-rose-400">{error}</p>
        ) : !group ? (
          <p className="text-sm text-slate-400">Group not found.</p>
        ) : (
          <div className="space-y-4">
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold">{group.name}</h1>
                  <p className="mt-2 text-sm text-slate-400">{group.description || "No description."}</p>
                </div>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase text-slate-400">
                  {group.visibility ?? "public"}
                </span>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                <span>Owner: {group.owner?.fullName || group.owner?.username || "Unknown"}</span>
                <span>Members: {group.memberCount ?? group.members?.length ?? 0}</span>
              </div>

              {group.roomId ? (
                <button
                  onClick={() => router.push(`/chat?roomId=${group.roomId}`)}
                  className="mt-4 rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400"
                >
                  Open Group Chat
                </button>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No linked chat room yet.</p>
              )}
            </section>

            {canInvite ? (
              <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Invite members</h2>
                    <p className="mt-1 text-sm text-slate-400">Search a user and send a group invite.</p>
                  </div>
                  <div className="flex w-full max-w-xl gap-2">
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
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-400 focus:ring-2"
                    />
                    <button
                      type="button"
                      onClick={() => void runInviteSearch()}
                      className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400"
                    >
                      Search
                    </button>
                  </div>
                </div>
                {inviteLoading ? <p className="text-sm text-slate-400">Searching users...</p> : null}
                <div className="space-y-3">
                  {inviteResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <div>
                        <p className="font-medium">{user.fullName}</p>
                        <p className="text-sm text-slate-400">
                          {user.username ? `@${user.username} · ` : ""}
                          {user.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void onInvite(user.id)}
                        disabled={invitingUserId === user.id}
                        className="rounded-md bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
                      >
                        {invitingUserId === user.id ? "Inviting..." : "Invite"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-3 text-lg font-semibold">Members</h2>
              {!group.members?.length ? (
                <p className="text-sm text-slate-400">No active members listed.</p>
              ) : (
                <div className="space-y-3">
                  {group.members.map((member) => (
                    <Link
                      key={member.id}
                      href={`/users/${member.id}`}
                      className="block rounded-lg border border-slate-800 bg-slate-950 p-3 hover:border-slate-700"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{member.fullName || member.username || member.email}</p>
                          <p className="text-sm text-slate-400">
                            {member.username ? `@${member.username}` : member.email}
                          </p>
                        </div>
                        <span className="text-xs uppercase text-slate-500">{member.roomRole || "member"}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
