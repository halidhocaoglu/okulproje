"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

import {
  ApiError,
  RelationshipState,
  UserPresence,
  UserProfile,
  blockUser,
  followUser,
  getCurrentUser,
  getRelationshipState,
  getUserById,
  getUserPresence,
  respondToFriendRequest,
  sendFriendRequest,
  SOCKET_BASE_URL,
  startDirectMessage,
  unblockUser,
  unfollowUser,
} from "../../../lib/api";
import { clearAccessToken, getAccessToken } from "../../../lib/auth";
import { NotificationBell } from "../../../components/notification-bell";

type UserProfilePageProps = {
  params: {
    id: string;
  };
};

const BLOCKED_DM_MESSAGE = "Direct messages are disabled between blocked users.";

export default function UserProfilePage({ params }: UserProfilePageProps) {
  const router = useRouter();
  const [viewer, setViewer] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [relationship, setRelationship] = useState<RelationshipState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingDm, setStartingDm] = useState(false);
  const [dmError, setDmError] = useState<string | null>(null);
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialFeedback, setSocialFeedback] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/");
      return;
    }

    void bootstrap();
  }, [params.id, router]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socket: Socket = io(`${SOCKET_BASE_URL}/chat`, {
      auth: {
        token: `Bearer ${token}`,
      },
    });

    socket.on("presence.updated", (payload: UserPresence) => {
      if (payload.userId !== params.id) return;
      setPresence(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, [params.id]);

  async function bootstrap() {
    setLoading(true);
    setError(null);
    try {
      const [me, targetProfile, targetPresence] = await Promise.all([
        getCurrentUser(),
        getUserById(params.id),
        getUserPresence(params.id).catch(() => null),
      ]);
      setViewer(me);
      setProfile(targetProfile);
      setPresence(targetPresence);

      if (me.id !== params.id) {
        const social = await getRelationshipState(params.id);
        setRelationship(social);
      } else {
        setRelationship({
          targetUserId: params.id,
          isSelf: true,
          friendshipStatus: "none",
          friendRequestId: null,
          isFollowing: false,
          isFollowedBy: false,
          isBlocked: false,
          isBlockedBy: false,
          followersCount: 0,
          followingCount: 0,
        });
      }
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err instanceof Error ? err.message : "Failed to load user profile.");
    } finally {
      setLoading(false);
    }
  }

  function handleAuthError(err: unknown) {
    const message =
      err instanceof ApiError
        ? `${err.status}:${err.message}`
        : err instanceof Error
          ? err.message
          : "";
    if (message.includes("401") || message.includes("Unauthorized") || message.includes("NO_TOKEN")) {
      clearAccessToken();
      router.replace("/");
      return true;
    }
    return false;
  }

  async function refreshRelationship() {
    if (!viewer || !profile || viewer.id === profile.id) {
      return;
    }

    const social = await getRelationshipState(profile.id);
    setRelationship(social);
  }

  async function runSocialAction(action: () => Promise<unknown>, successMessage: string) {
    setSocialLoading(true);
    setError(null);
    setDmError(null);
    setSocialFeedback(null);
    try {
      await action();
      await refreshRelationship();
      setSocialFeedback(successMessage);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err instanceof Error ? err.message : "Social action failed.");
    } finally {
      setSocialLoading(false);
    }
  }

  async function onStartMessage() {
    if (!profile || relationship?.isBlocked || relationship?.isBlockedBy) {
      setDmError(BLOCKED_DM_MESSAGE);
      return;
    }
    setStartingDm(true);
    setDmError(null);
    try {
      const dm = await startDirectMessage(profile.id);
      router.push(`/chat?roomId=${dm.roomId}`);
    } catch (err) {
      if (handleAuthError(err)) return;
      if (err instanceof ApiError && err.status === 403) {
        setDmError(BLOCKED_DM_MESSAGE);
      } else {
        setDmError(err instanceof Error ? err.message : "Failed to start direct message.");
      }
    } finally {
      setStartingDm(false);
    }
  }

  function logout() {
    clearAccessToken();
    router.replace("/");
  }

  function formatLastSeen(value?: string) {
    if (!value) return "Last seen recently";
    const diffMs = Date.now() - new Date(value).getTime();
    if (diffMs < 60_000) return "Last seen just now";
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 60) return `Last seen ${diffMin} min ago`;
    const diffHour = Math.floor(diffMin / 60);
    return `Last seen ${diffHour} hour ago`;
  }

  function friendshipLabel() {
    switch (relationship?.friendshipStatus) {
      case "friends":
        return "Friends";
      case "incoming_request":
        return "Incoming friend request";
      case "outgoing_request":
        return "Friend request sent";
      default:
        return "Not connected";
    }
  }

  return (
    <main className="isu-dashboard-scene relative min-h-screen overflow-x-hidden text-slate-100">
      <div className="isu-soft-pattern pointer-events-none absolute inset-0" />
      <div className="isu-orb left-[-7rem] top-12 h-72 w-72 opacity-60" />
      <div className="isu-orb bottom-[-10rem] right-[-5rem] h-96 w-96 opacity-52" />
      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-5 lg:px-6">
        <header className="isu-topbar relative mb-5 overflow-hidden rounded-[1.75rem] px-5 py-5">
          <div className="isu-sheen" />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.34em] text-[#7fb7dc]">Profile view</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {profile?.fullName ?? "Campus profile"}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--isu-text-soft)] sm:text-base">
                  Social actions, presence, and account context in a cleaner split layout for both phone and desktop.
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
                <Link href="/friends" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Friends</Link>
                <Link href="/following" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Following</Link>
                <Link href={`/users/${params.id}`} className="isu-button-primary rounded-full px-4 py-2 font-medium">Profile</Link>
              </nav>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Followers</p>
                <p className="mt-3 text-3xl font-semibold text-white">{relationship?.followersCount ?? 0}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Accounts following this profile.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Following</p>
                <p className="mt-3 text-3xl font-semibold text-white">{relationship?.followingCount ?? 0}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">People they actively follow.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Relationship</p>
                <p className="mt-3 text-lg font-semibold text-white">{friendshipLabel()}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Current social connection state.</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
          <div className="space-y-5">
            <section className="isu-panel rounded-[1.75rem] p-5">
              {loading ? <p className="text-sm text-slate-400">Loading profile...</p> : null}
              {error ? <p className="rounded-2xl border border-rose-800/50 bg-rose-950/20 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

              {!loading && !error && profile ? (
                <>
                  <div className="flex items-start gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.7rem] border border-[rgba(127,183,220,0.18)] bg-[linear-gradient(135deg,rgba(56,128,176,0.26),rgba(8,19,29,0.9))] text-2xl font-semibold text-white">
                      {profile.fullName
                        .split(" ")
                        .map((part) => part[0]?.toUpperCase() ?? "")
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-2xl font-semibold text-white">{profile.fullName}</h2>
                      <p className="mt-1 text-sm text-[var(--isu-text-soft)]">
                        {profile.username ? `@${profile.username}` : profile.email}
                      </p>
                      {profile.bio ? <p className="mt-3 text-sm leading-6 text-slate-300">{profile.bio}</p> : null}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <div className="isu-subtle-card rounded-[1.4rem] px-4 py-4 text-sm text-slate-300">
                      <p><span className="text-slate-400">Email:</span> {profile.email}</p>
                      <p className="mt-2"><span className="text-slate-400">Department:</span> {profile.department?.name ?? "Not assigned"}</p>
                      <p className="mt-2"><span className="text-slate-400">Role:</span> {profile.role ?? "student"}</p>
                    </div>

                    <div className="isu-subtle-card rounded-[1.4rem] px-4 py-4 text-sm text-slate-300">
                      <p>
                        <span className="text-slate-400">Presence:</span>{" "}
                        {presence?.status === "online" ? "Online" : formatLastSeen(presence?.lastSeen)}
                      </p>
                      <p className="mt-2">
                        <span className="text-slate-400">Connection:</span> {friendshipLabel()}
                      </p>
                      <p className="mt-2">
                        <span className="text-slate-400">Followed by you:</span>{" "}
                        {relationship?.isFollowing ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                </>
              ) : null}
            </section>
          </div>

          <div className="space-y-5">
            {socialFeedback ? <p className="rounded-2xl border border-emerald-800/40 bg-emerald-950/15 px-4 py-3 text-sm text-emerald-300">{socialFeedback}</p> : null}
            {dmError ? <p className="rounded-2xl border border-rose-800/50 bg-rose-950/20 px-4 py-3 text-sm text-rose-300">{dmError}</p> : null}

            {!relationship?.isSelf ? (
              <section className="isu-panel rounded-[1.75rem] p-5">
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Actions</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Interact with this account</h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={onStartMessage}
                    disabled={startingDm || Boolean(relationship?.isBlocked || relationship?.isBlockedBy)}
                    className="isu-button-primary rounded-2xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {startingDm ? "Starting..." : "Start message"}
                  </button>

                  {relationship?.isFollowing ? (
                    <button
                      onClick={() => runSocialAction(() => unfollowUser(profile!.id), "User unfollowed.")}
                      disabled={socialLoading}
                      className="isu-chip rounded-2xl px-4 py-3 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)] disabled:opacity-70"
                    >
                      Unfollow
                    </button>
                  ) : (
                    <button
                      onClick={() => runSocialAction(() => followUser(profile!.id), "Now following user.")}
                      disabled={socialLoading || Boolean(relationship?.isBlocked || relationship?.isBlockedBy)}
                      className="isu-chip rounded-2xl px-4 py-3 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)] disabled:opacity-70"
                    >
                      Follow
                    </button>
                  )}

                  {relationship?.friendshipStatus === "none" ? (
                    <button
                      onClick={() => runSocialAction(() => sendFriendRequest(profile!.id), "Friend request sent.")}
                      disabled={socialLoading || Boolean(relationship?.isBlocked || relationship?.isBlockedBy)}
                      className="isu-chip rounded-2xl px-4 py-3 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)] disabled:opacity-70"
                    >
                      Add friend
                    </button>
                  ) : null}

                  {relationship?.isBlocked ? (
                    <button
                      onClick={() => runSocialAction(() => unblockUser(profile!.id), "User unblocked.")}
                      disabled={socialLoading}
                      className="rounded-2xl border border-amber-700 px-4 py-3 text-sm text-amber-300 hover:bg-amber-900/30 disabled:opacity-70"
                    >
                      Unblock
                    </button>
                  ) : (
                    <button
                      onClick={() => runSocialAction(() => blockUser(profile!.id), "User blocked.")}
                      disabled={socialLoading}
                      className="rounded-2xl border border-rose-700 px-4 py-3 text-sm text-rose-300 hover:bg-rose-900/30 disabled:opacity-70"
                    >
                      Block
                    </button>
                  )}
                </div>

                {relationship?.friendshipStatus === "incoming_request" && relationship.friendRequestId ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() =>
                        runSocialAction(
                          () => respondToFriendRequest(relationship.friendRequestId!, "accept"),
                          "Friend request accepted.",
                        )
                      }
                      disabled={socialLoading}
                      className="rounded-2xl border border-emerald-700 px-4 py-3 text-sm text-emerald-300 hover:bg-emerald-900/30 disabled:opacity-70"
                    >
                      Accept friend request
                    </button>
                    <button
                      onClick={() =>
                        runSocialAction(
                          () => respondToFriendRequest(relationship.friendRequestId!, "reject"),
                          "Friend request rejected.",
                        )
                      }
                      disabled={socialLoading}
                      className="rounded-2xl border border-rose-700 px-4 py-3 text-sm text-rose-300 hover:bg-rose-900/30 disabled:opacity-70"
                    >
                      Reject request
                    </button>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="isu-panel rounded-[1.75rem] p-5">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Notes</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Context</h2>
              </div>
              <div className="space-y-3 text-sm leading-6 text-[var(--isu-text-soft)]">
                <p>Friend status and follow status are separate, so you can track someone without adding them directly.</p>
                <p>Blocking disables direct messages and prevents the chat action from opening a room.</p>
                <p>Presence updates refresh live through the same socket channel used by chat.</p>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
