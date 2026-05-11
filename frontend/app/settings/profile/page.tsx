"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Department, getCurrentUser, getDepartments, updateCurrentUser } from "../../../lib/api";
import { clearAccessToken, getAccessToken } from "../../../lib/auth";
import { NotificationBell } from "../../../components/notification-bell";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

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
      const [profile, departmentList] = await Promise.all([getCurrentUser(), getDepartments()]);
      setDepartments(departmentList);
      setFullName(profile.fullName ?? "");
      setUsername(profile.username ?? "");
      setBio(profile.bio ?? "");
      setDepartmentId(profile.department?.id ?? "");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load profile settings.";
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

  function normalizeUsername(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9._]/g, "");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedFullName = fullName.trim();
    const normalizedUsername = normalizeUsername(username);

    if (!normalizedFullName) {
      setError("Full name is required.");
      return;
    }

    if (!normalizedUsername || normalizedUsername.length < 3) {
      setError("Username must be at least 3 characters and use only letters, numbers, dots, or underscores.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateCurrentUser({
        full_name: normalizedFullName,
        username: normalizedUsername,
        bio: bio.trim() || undefined,
        department_id: departmentId || undefined,
      });
      setUsername(normalizedUsername);
      setSuccess("Profile updated.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update profile.";
      if (message.includes("Username is already in use")) {
        setError("That username is already taken.");
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    clearAccessToken();
    router.replace("/");
  }

  const previewInitials = useMemo(
    () =>
      fullName
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "IS",
    [fullName],
  );

  const selectedDepartmentName =
    departments.find((department) => department.id === departmentId)?.name ?? "No department selected";

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
                <p className="text-xs uppercase tracking-[0.34em] text-[#7fb7dc]">Profile settings</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Refine how your account appears across campus.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--isu-text-soft)] sm:text-base">
                  Update identity details, department mapping, and public profile text from a cleaner split layout.
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
                <Link href="/settings" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Settings</Link>
                <Link href="/settings/profile" className="isu-button-primary rounded-full px-4 py-2 font-medium">Profile</Link>
                <Link href="/settings" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Account</Link>
              </nav>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Username</p>
                <p className="mt-3 text-lg font-semibold text-white">@{username || "pending"}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Public handle shown in rooms and profiles.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Department</p>
                <p className="mt-3 text-lg font-semibold text-white">{selectedDepartmentName}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Current academic placement inside the network.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Bio length</p>
                <p className="mt-3 text-3xl font-semibold text-white">{bio.trim().length}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Characters currently visible in your profile bio.</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[0.8fr,1.2fr]">
          <div className="space-y-5">
            <section className="isu-panel rounded-[1.75rem] p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.8rem] border border-[rgba(127,183,220,0.18)] bg-[linear-gradient(135deg,rgba(56,128,176,0.26),rgba(8,19,29,0.9))] text-3xl font-semibold text-white">
                  {previewInitials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Preview</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{fullName || "Your name"}</h2>
                  <p className="mt-1 text-sm text-[var(--isu-text-soft)]">@{username || "username"}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {bio.trim() || "Your short profile bio will appear here once you write one."}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm text-[var(--isu-text-soft)]">
                <p>Department: <span className="text-slate-200">{selectedDepartmentName}</span></p>
                <p>Avatar placeholder URL is local-only for now and stays ready for future media support.</p>
              </div>
            </section>
          </div>

          <section className="isu-panel rounded-[1.75rem] p-5">
            <div className="mb-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Edit</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Profile form</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--isu-text-soft)]">
                Keep your identity readable across chat, materials, groups, and profile cards.
              </p>
            </div>

            {loading ? <p className="text-sm text-slate-400">Loading profile settings...</p> : null}

            {!loading ? (
              <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Full name</span>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="isu-input w-full rounded-2xl px-4 py-3 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Username</span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(normalizeUsername(event.target.value))}
                    className="isu-input w-full rounded-2xl px-4 py-3 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Department</span>
                  <select
                    value={departmentId}
                    onChange={(event) => setDepartmentId(event.target.value)}
                    className="isu-input w-full rounded-2xl bg-[rgba(8,19,29,0.94)] px-4 py-3 text-sm text-slate-100"
                  >
                    <option value="" className="bg-[#0b1722] text-slate-100">Select department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id} className="bg-[#0b1722] text-slate-100">
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Bio</span>
                  <textarea
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    rows={4}
                    className="isu-input w-full rounded-2xl px-4 py-3 text-sm"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Avatar placeholder URL</span>
                  <input
                    value={avatarUrl}
                    onChange={(event) => setAvatarUrl(event.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="isu-input w-full rounded-2xl px-4 py-3 text-sm"
                  />
                </label>

                {error ? <p className="text-sm text-rose-400 md:col-span-2">{error}</p> : null}
                {success ? <p className="text-sm text-emerald-400 md:col-span-2">{success}</p> : null}

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="isu-button-primary rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-70"
                  >
                    {saving ? "Saving..." : "Save profile"}
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}
