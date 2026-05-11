"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Department, getCurrentUser, getDepartments, login, register } from "../lib/api";
import { setAccessToken } from "../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentsRequested, setDepartmentsRequested] = useState(false);
  const [fullName, setFullName] = useState("");
  const [usernamePrefix, setUsernamePrefix] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const fixedDomain = "@isu.edu.tr";

  const normalizedPrefix = useMemo(
    () => usernamePrefix.trim().toLowerCase().replace(/\s+/g, ""),
    [usernamePrefix]
  );

  useEffect(() => {
    if (mode !== "register") {
      return;
    }

    if (departments.length > 0 || departmentsLoading || departmentsRequested) {
      return;
    }

    void loadDepartments();
  }, [mode, departments.length, departmentsLoading, departmentsRequested]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data =
        mode === "login"
          ? await login(email.trim().toLowerCase(), password)
          : await submitRegister();
      setAccessToken(data.accessToken);
      const profile = await getCurrentUser();
      const needsOnboarding =
        profile.onboardingCompleted === false ||
        !profile.fullName?.trim() ||
        !profile.username?.trim() ||
        !profile.department?.id;
      router.push(needsOnboarding ? "/onboarding" : "/chat");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(resolveErrorMessage(message));
    } finally {
      setLoading(false);
    }
  }

  async function loadDepartments() {
    setDepartmentsRequested(true);
    setDepartmentsLoading(true);
    try {
      const data = await getDepartments();
      setDepartments(data);
      if (!selectedDepartmentId && data[0]?.id) {
        setSelectedDepartmentId(data[0].id);
      }
    } catch {
      setError("Departments could not be loaded.");
    } finally {
      setDepartmentsLoading(false);
    }
  }

  async function submitRegister() {
    const prefixValidationError = validatePrefix(normalizedPrefix);
    if (prefixValidationError) {
      throw new Error(prefixValidationError);
    }

    if (!fullName.trim()) {
      throw new Error("Full name is required.");
    }

    if (registerPassword.trim().length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    if (!selectedDepartmentId) {
      throw new Error("Please select a department.");
    }

    return register({
      full_name: fullName.trim(),
      email: `${normalizedPrefix}${fixedDomain}`,
      password: registerPassword,
      department_id: selectedDepartmentId,
      username: normalizedPrefix
    });
  }

  function validatePrefix(value: string): string | null {
    if (!value) {
      return "Username is required.";
    }

    if (!/^[a-z0-9._]+$/.test(value)) {
      return "Use only lowercase letters, numbers, dots, and underscores.";
    }

    if (value.length < 3) {
      return "Username must be at least 3 characters.";
    }

    if (value.length > 30) {
      return "Username must be 30 characters or fewer.";
    }

    return null;
  }

  function resolveErrorMessage(message: string): string {
    if (!message) {
      return mode === "login" ? "Login failed. Check credentials." : "Registration failed.";
    }

    if (message.includes("Username is already in use")) {
      return "This username is already taken.";
    }

    if (message.includes("Email is already registered")) {
      return "This university email is already registered.";
    }

    if (message.includes("Department does not belong")) {
      return "Selected department is invalid.";
    }

    if (message.includes("@isu.edu.tr")) {
      return "Email must use the fixed @isu.edu.tr domain.";
    }

    if (message.includes("Selected school is invalid")) {
      return "Default university configuration is missing.";
    }

    if (message.includes("Password") || message.includes("at least 8 characters")) {
      return message;
    }

    return mode === "login" ? "Login failed. Check credentials." : "Registration failed.";
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(84,164,218,0.36),_transparent_24%),radial-gradient(circle_at_82%_18%,_rgba(56,128,176,0.24),_transparent_18%),linear-gradient(180deg,_#07111a_0%,_#0d1a27_44%,_#08131d_100%)]" />
        <div className="isu-grid absolute inset-0 opacity-45" />
        <div className="isu-orb -left-20 top-10 h-72 w-72" />
        <div className="isu-orb right-[-80px] top-1/4 h-80 w-80" />
        <div className="isu-orb bottom-[-100px] left-1/3 h-72 w-72 opacity-55" />
        <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(84,164,218,0.16),transparent)]" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <span className="isu-chip inline-flex rounded-full px-4 py-2 text-xs uppercase tracking-[0.34em]">
              IsuChat Platform
            </span>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-white">
              Bring university communication
              <span className="block bg-[linear-gradient(135deg,#bce8ff_0%,#54a4da_32%,#3880b0_64%,#7fb7dc_100%)] bg-clip-text text-transparent">
                into a more vivid flow.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-[color:var(--isu-text-soft)]">
              Chat, materials, department activity, and campus connections come together in one focused interface.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="isu-panel isu-sheen rounded-3xl p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#7fb7dc]">Realtime</p>
                <p className="mt-3 text-sm text-slate-200">Live chat, alerts, and presence updates.</p>
              </div>
              <div className="isu-panel isu-sheen rounded-3xl p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#7fb7dc]">Academic</p>
                <p className="mt-3 text-sm text-slate-200">Materials, courses, and department-focused discovery.</p>
              </div>
              <div className="isu-panel isu-sheen rounded-3xl p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#7fb7dc]">Connected</p>
                <p className="mt-3 text-sm text-slate-200">A cleaner network for campus-wide collaboration.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="relative mx-auto flex w-full max-w-md items-center lg:justify-end">
        <form
          onSubmit={onSubmit}
          className="isu-panel isu-sheen w-full rounded-[2rem] p-6 sm:p-7"
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#7fb7dc]">Isu University Network</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                {mode === "login" ? "IsuChat Login" : "IsuChat Register"}
              </h1>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[color:var(--isu-text-soft)]">
                {mode === "login"
                  ? "Sign in to continue to your campus network."
                  : "Create your account with your institutional email."}
              </p>
            </div>
            <div className="flex rounded-full border border-[rgba(127,183,220,0.24)] bg-[rgba(4,12,20,0.72)] p-1 text-sm shadow-[inset_0_0_0_1px_rgba(56,128,176,0.08)]">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setDepartmentsRequested(false);
                }}
                className={`rounded-full px-4 py-2 transition ${
                  mode === "login"
                    ? "isu-accent-ring bg-[#3880b0] font-medium text-[#08131d] shadow-[0_10px_28px_rgba(56,128,176,0.28)]"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                  setDepartmentsRequested(false);
                }}
                className={`rounded-full px-4 py-2 transition ${
                  mode === "register"
                    ? "isu-accent-ring bg-[#3880b0] font-medium text-[#08131d] shadow-[0_10px_28px_rgba(56,128,176,0.28)]"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Register
              </button>
            </div>
          </div>

          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[rgba(127,183,220,0.12)] bg-[rgba(7,17,27,0.72)] px-4 py-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#54a4da,#3880b0)] text-lg font-semibold text-[#07131d] shadow-[0_12px_28px_rgba(56,128,176,0.28)]">
              I
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-100">Institutional Access</p>
              <p className="text-xs text-[color:var(--isu-text-soft)]">
                {mode === "login"
                  ? "Access your account."
                  : "Choose your department and continue."}
              </p>
            </div>
          </div>

          {mode === "login" ? (
            <>
              <label className="mb-4 block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Email</span>
                <input
                  className="isu-input w-full rounded-2xl px-4 py-3.5 outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="name@domain.com"
                  required
                />
              </label>
              <label className="mb-5 block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Password</span>
                <input
                  className="isu-input w-full rounded-2xl px-4 py-3.5 outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="Enter your password"
                  required
                />
              </label>
            </>
          ) : (
            <>
              <label className="mb-4 block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Full name</span>
                <input
                  className="isu-input w-full rounded-2xl px-4 py-3.5 outline-none"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  type="text"
                  placeholder="Enter your full name"
                  required
                />
              </label>
              <label className="mb-4 block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Institutional email username</span>
                <div className="overflow-hidden rounded-2xl border border-[rgba(127,183,220,0.18)] bg-[rgba(5,14,24,0.92)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                  <div className="flex items-center">
                  <input
                    className="isu-input min-w-0 flex-1 rounded-none border-0 bg-transparent px-4 py-3.5 lowercase outline-none"
                    value={usernamePrefix}
                    onChange={(e) =>
                      setUsernamePrefix(e.target.value.trim().toLowerCase().replace(/\s+/g, ""))
                    }
                    placeholder="username"
                    type="text"
                    required
                  />
                  <span className="border-l border-[rgba(127,183,220,0.14)] bg-[linear-gradient(180deg,rgba(56,128,176,0.18),rgba(56,128,176,0.08))] px-4 py-3.5 text-sm font-semibold text-[#a7d8f4]">
                    {fixedDomain}
                  </span>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-5 text-[color:var(--isu-text-soft)]">
                  This will be used as the part before {fixedDomain}. Only letters, numbers, dots, and underscores are allowed.
                </p>
              </label>
              <label className="mb-4 block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Department</span>
                <select
                  className="isu-input w-full rounded-2xl bg-[rgba(8,19,29,0.94)] px-4 py-3.5 text-slate-100 outline-none"
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  required
                >
                  <option value="">
                    {departmentsLoading ? "Loading departments..." : "Select department"}
                  </option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id} className="bg-[#0b1722] text-slate-100">
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mb-5 block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Password</span>
                <input
                  className="isu-input w-full rounded-2xl px-4 py-3.5 outline-none"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  type="password"
                  placeholder="Create a password"
                  required
                />
              </label>
            </>
          )}
          {error ? (
            <p className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200 shadow-[0_0_0_1px_rgba(251,113,133,0.08)]">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="isu-button-primary w-full rounded-2xl px-4 py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading
              ? mode === "login"
                ? "Logging in..."
                : "Registering..."
              : mode === "login"
                ? "Login"
                : "Register"}
          </button>
        </form>
        </div>
      </div>
    </main>
  );
}
