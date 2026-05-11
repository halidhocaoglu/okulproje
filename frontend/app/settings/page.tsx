"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { NotificationPreferences, getNotificationPreferences, updateNotificationPreferences } from "../../lib/api";
import { clearAccessToken, getAccessToken } from "../../lib/auth";
import { NotificationBell } from "../../components/notification-bell";

export default function SettingsPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/");
      return;
    }

    void loadPreferences();
  }, [router]);

  async function loadPreferences() {
    setLoading(true);
    setError(null);
    try {
      setPreferences(await getNotificationPreferences());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load settings.";
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

  async function onToggle(key: keyof NotificationPreferences, value: boolean) {
    if (!preferences) return;

    const next = { ...preferences, [key]: value };
    setPreferences(next);
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateNotificationPreferences({
        messageNotificationsEnabled: next.messageNotificationsEnabled,
        socialNotificationsEnabled: next.socialNotificationsEnabled,
        materialNotificationsEnabled: next.materialNotificationsEnabled,
        systemNotificationsEnabled: next.systemNotificationsEnabled,
      });
      setPreferences(updated);
      setSuccess("Notification preferences saved.");
    } catch (err) {
      setPreferences(preferences);
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    clearAccessToken();
    router.replace("/");
  }

  const cards = [
    {
      key: "messageNotificationsEnabled" as const,
      title: "DM notifications",
      description: "Receive alerts for direct messages.",
    },
    {
      key: "socialNotificationsEnabled" as const,
      title: "Group notifications",
      description: "Receive alerts for social and group activity.",
    },
    {
      key: "materialNotificationsEnabled" as const,
      title: "Material notifications",
      description: "Receive alerts for material comments and updates.",
    },
  ];

  return (
    <main className="isu-dashboard-scene relative min-h-screen overflow-x-hidden text-slate-100">
      <div className="isu-soft-pattern pointer-events-none absolute inset-0" />
      <div className="isu-orb left-[-7rem] top-10 h-64 w-64 opacity-60" />
      <div className="isu-orb bottom-[-9rem] right-[-6rem] h-80 w-80 opacity-55" />
      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-5 lg:px-6">
        <header className="isu-topbar relative mb-5 overflow-hidden rounded-[1.75rem] px-5 py-5">
          <div className="isu-sheen" />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.3em] text-[#7fb7dc]">Preferences</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Settings</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--isu-text-soft)] sm:text-base">
                  Control which university updates surface first and keep account preferences more readable on every screen size.
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
                <Link href="/settings" className="isu-button-primary rounded-full px-4 py-2 font-medium">Settings</Link>
                <Link href="/settings/profile" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Profile</Link>
                <Link href="/friends" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Friends</Link>
                <Link href="/admin" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Admin</Link>
              </nav>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Messages</p>
                <p className="mt-3 text-lg font-semibold text-white">{preferences?.messageNotificationsEnabled ? "Enabled" : "Off"}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Direct message alert state.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Social</p>
                <p className="mt-3 text-lg font-semibold text-white">{preferences?.socialNotificationsEnabled ? "Enabled" : "Off"}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Friends, follows, and group activity.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Materials</p>
                <p className="mt-3 text-lg font-semibold text-white">{preferences?.materialNotificationsEnabled ? "Enabled" : "Off"}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Resource comments and update alerts.</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[0.9fr,1.1fr]">
          <section className="isu-panel rounded-[1.75rem] p-5">
            <div className="mb-5">
              <h2 className="text-2xl font-semibold text-white">Notification settings</h2>
              <p className="mt-2 text-sm text-slate-400">
                Control which university updates should surface in your notifications.
              </p>
            </div>

            {loading ? <p className="text-sm text-slate-400">Loading settings...</p> : null}
            {error ? <p className="mb-3 text-sm text-rose-400">{error}</p> : null}
            {success ? <p className="mb-3 text-sm text-emerald-400">{success}</p> : null}

            {!loading && preferences ? (
              <div className="space-y-3">
                {cards.map((card) => (
                  <div
                    key={card.key}
                    className="flex flex-col gap-3 rounded-[1.4rem] border border-[rgba(127,183,220,0.16)] bg-[linear-gradient(180deg,rgba(12,28,41,0.96),rgba(8,19,29,0.92))] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h3 className="font-medium text-white">{card.title}</h3>
                      <p className="mt-1 text-sm text-slate-400">{card.description}</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(preferences[card.key])}
                        onChange={(event) => onToggle(card.key, event.target.checked)}
                        disabled={saving}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-slate-300">
                        {preferences[card.key] ? "Enabled" : "Disabled"}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="isu-panel rounded-[1.75rem] p-5">
            <div className="mb-5">
              <h2 className="text-2xl font-semibold text-white">System guidance</h2>
              <p className="mt-2 text-sm text-slate-400">
                System notifications stay on for account, safety, and critical moderation events.
              </p>
            </div>
            <div className="space-y-3 text-sm leading-6 text-[var(--isu-text-soft)]">
              <p>Message alerts are best kept on if you actively use direct messaging and course rooms.</p>
              <p>Social alerts cover friend requests, follows, and incoming group invites.</p>
              <p>Material alerts help when you collaborate around comments, uploads, and shared academic resources.</p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
