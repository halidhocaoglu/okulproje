"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SearchResult,
  searchAll,
  searchGroups,
  searchMaterials,
  searchUsers
} from "../../lib/api";
import { clearAccessToken, getAccessToken } from "../../lib/auth";
import { NotificationBell } from "../../components/notification-bell";

type SearchTab = "all" | "materials" | "users" | "groups";
type SearchEntityType = "material" | "user" | "group";

export default function SearchPage() {
  const PAGE_SIZE = 15;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const tabs: Array<{ key: SearchTab; label: string }> = useMemo(
    () => [
      { key: "all", label: "All" },
      { key: "materials", label: "Materials" },
      { key: "users", label: "Users" },
      { key: "groups", label: "Groups" }
    ],
    []
  );

  function getValidToken() {
    const token = getAccessToken();
    if (!token) {
      return null;
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      return token;
    }

    try {
      const payload = JSON.parse(atob(parts[1])) as { exp?: number };
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        clearAccessToken();
        return null;
      }
    } catch {
      return token;
    }

    return token;
  }

  function ensureToken() {
    const token = getValidToken();
    if (!token) {
      router.replace("/");
      return false;
    }
    return true;
  }

  function logout() {
    clearAccessToken();
    router.replace("/");
  }

  function isAuthError(err: unknown): boolean {
    const message = err instanceof Error ? err.message : "";
    return (
      message.includes("NO_TOKEN") ||
      message.includes("401") ||
      message.includes("Unauthorized")
    );
  }

  function normalizeEntityType(value?: string): SearchEntityType {
    const normalized = (value ?? "").toLowerCase();
    if (normalized === "material" || normalized === "materials") return "material";
    if (normalized === "user" || normalized === "users") return "user";
    return "group";
  }

  function mapToSearchResult(
    raw: Record<string, unknown>,
    fallbackType: SearchEntityType
  ): SearchResult {
    const entityType = normalizeEntityType(
      typeof raw.entityType === "string" ? raw.entityType : fallbackType
    );
    const entityId =
      (typeof raw.entityId === "string" && raw.entityId) ||
      (typeof raw.id === "string" && raw.id) ||
      "";
    const title =
      (typeof raw.title === "string" && raw.title) ||
      (typeof raw.name === "string" && raw.name) ||
      (typeof raw.fullName === "string" && raw.fullName) ||
      (typeof raw.username === "string" && raw.username) ||
      "Untitled";
    const preview =
      (typeof raw.preview === "string" && raw.preview) ||
      (typeof raw.description === "string" && raw.description) ||
      (typeof raw.bio === "string" && raw.bio) ||
      undefined;
    const createdAt =
      (typeof raw.createdAt === "string" && raw.createdAt) ||
      (typeof raw.created_at === "string" && raw.created_at) ||
      undefined;

    return {
      entityType,
      entityId,
      title,
      preview,
      createdAt,
      metadata:
        raw.metadata && typeof raw.metadata === "object"
          ? (raw.metadata as Record<string, unknown>)
          : undefined,
      relevanceScore:
        typeof raw.relevanceScore === "number"
          ? raw.relevanceScore
          : typeof raw.relevance_score === "number"
            ? raw.relevance_score
            : undefined
    };
  }

  function pickArray(
    value: unknown
  ): Array<Record<string, unknown>> {
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null
    );
  }

  function normalizeSearchResponse(
    payload: unknown,
    tab: SearchTab
  ): SearchResult[] {
    if (Array.isArray(payload)) {
      return payload
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => mapToSearchResult(item, tab === "all" ? "material" : normalizeEntityType(tab)));
    }

    if (!payload || typeof payload !== "object") {
      return [];
    }

    const data = payload as Record<string, unknown>;
    const directResults = pickArray(data.results);
    if (directResults.length > 0) {
      return directResults.map((item) => mapToSearchResult(item, tab === "all" ? "material" : normalizeEntityType(tab)));
    }

    const items = pickArray(data.items);
    if (items.length > 0) {
      return items.map((item) => mapToSearchResult(item, tab === "all" ? "material" : normalizeEntityType(tab)));
    }

    const materials = pickArray(data.materials).map((item) =>
      mapToSearchResult(item, "material")
    );
    const users = pickArray(data.users).map((item) => mapToSearchResult(item, "user"));
    const groups = pickArray(data.groups).map((item) => mapToSearchResult(item, "group"));

    if (tab === "materials") return materials;
    if (tab === "users") return users;
    if (tab === "groups") return groups;

    return [...materials, ...users, ...groups];
  }

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ensureToken()) return;

    const trimmed = query.trim();
    setSubmitted(true);
    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response =
        activeTab === "materials"
          ? await searchMaterials(trimmed)
          : activeTab === "users"
            ? await searchUsers(trimmed)
            : activeTab === "groups"
              ? await searchGroups(trimmed)
              : await searchAll(trimmed);

      setResults(normalizeSearchResponse(response, activeTab));
      setVisibleCount(PAGE_SIZE);
    } catch (err) {
      if (isAuthError(err)) {
        clearAccessToken();
        router.replace("/");
        return;
      }

      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  const visibleResults = useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount]
  );

  function toMaterialHref(result: SearchResult): string | null {
    if (result.entityType !== "material") return null;
    return `/materials/${result.entityId}`;
  }

  function toUserHref(result: SearchResult): string | null {
    if (result.entityType !== "user") return null;
    return `/users/${result.entityId}`;
  }

  function toGroupHref(result: SearchResult): string | null {
    if (result.entityType !== "group") return null;
    return `/groups/${result.entityId}`;
  }

  return (
    <main className="search-scene relative min-h-screen overflow-x-hidden text-slate-100">
      <div className="search-pattern pointer-events-none absolute inset-0" />
      <div className="isu-orb left-[-8rem] top-10 h-64 w-64 opacity-65" />
      <div className="isu-orb bottom-[-9rem] right-[-4rem] h-80 w-80 opacity-55" />
      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-5 lg:px-6">
        <header className="isu-topbar relative mb-5 overflow-hidden rounded-[1.75rem] px-5 py-5 shadow-[0_20px_80px_rgba(8,19,29,0.35)]">
          <div className="isu-sheen" />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.3em] text-[#7fb7dc]">Discovery</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Search the network</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--isu-text-soft)] sm:text-base">
                  Find people, groups, and shared materials from one calmer search layer instead of bouncing across screens.
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
                <Link href="/materials" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Materials</Link>
                <Link href="/search" className="isu-button-primary rounded-full px-4 py-2 font-medium">Search</Link>
                <Link href="/groups" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Groups</Link>
                <Link href="/friends" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Friends</Link>
              </nav>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Scope</p>
                <p className="mt-3 text-3xl font-semibold text-white">3</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">People, materials, and groups in one pass.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Active tab</p>
                <p className="mt-3 text-xl font-semibold text-white">{tabs.find((tab) => tab.key === activeTab)?.label}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Quick filtering without changing pages.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Visible results</p>
                <p className="mt-3 text-3xl font-semibold text-white">{results.length}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Current matches for the submitted query.</p>
              </div>
            </div>
          </div>
        </header>

        <section className="isu-panel rounded-[1.75rem] p-5 shadow-[0_20px_80px_rgba(8,19,29,0.28)]">
          <form onSubmit={onSearch} className="mb-5 flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search materials, users, groups..."
                className="isu-input flex-1 rounded-2xl px-4 py-3 text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="isu-button-primary rounded-2xl px-5 py-3 text-sm font-medium disabled:opacity-70 sm:min-w-[140px]"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full px-3 py-1.5 text-xs transition ${
                    activeTab === tab.key
                      ? "isu-button-primary font-semibold"
                      : "isu-chip text-slate-200 hover:bg-[rgba(56,128,176,0.16)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </form>

          {error ? (
            <p className="mb-3 rounded-2xl border border-rose-800 bg-rose-950/30 px-3 py-3 text-sm text-rose-300">
              {error}
            </p>
          ) : null}

          {!loading && submitted && results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[rgba(127,183,220,0.18)] bg-[rgba(8,19,29,0.42)] px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-200">No results found.</p>
              <p className="mt-2 text-sm text-slate-400">Try another keyword or switch the active tab.</p>
            </div>
          ) : null}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`search-skeleton-${index}`}
                  className="animate-pulse rounded-2xl border border-[rgba(127,183,220,0.12)] bg-[rgba(8,19,29,0.72)] p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="h-5 w-16 rounded-full bg-[rgba(56,128,176,0.16)]" />
                    <div className="h-3 w-28 rounded bg-slate-800" />
                  </div>
                  <div className="h-4 w-1/2 rounded bg-slate-800" />
                  <div className="mt-3 h-3 w-full rounded bg-slate-800" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {visibleResults.map((result) => {
                const materialHref = toMaterialHref(result);
                const userHref = toUserHref(result);
                const groupHref = toGroupHref(result);
                const content = (
                  <>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="isu-chip px-2 py-0.5 text-[11px] uppercase text-slate-200">
                        {result.entityType}
                      </span>
                      {result.createdAt ? (
                        <span className="text-xs text-slate-400">
                          {new Date(result.createdAt).toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-sm font-semibold">{result.title}</h3>
                    <p className="mt-1 text-sm text-slate-300">
                      {result.preview || "No preview available"}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">ID: {result.entityId}</p>
                  </>
                );

                if (materialHref || userHref || groupHref) {
                  return (
                    <Link
                      key={`${result.entityType}-${result.entityId}`}
                      href={materialHref ?? userHref ?? groupHref ?? "#"}
                      className="block rounded-[1.5rem] border border-[rgba(127,183,220,0.16)] bg-[linear-gradient(180deg,rgba(12,28,41,0.96),rgba(8,19,29,0.92))] p-4 transition hover:border-[rgba(127,183,220,0.34)] hover:shadow-[0_20px_48px_rgba(4,10,16,0.24)]"
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div
                    key={`${result.entityType}-${result.entityId}`}
                    className="rounded-[1.5rem] border border-[rgba(127,183,220,0.16)] bg-[linear-gradient(180deg,rgba(12,28,41,0.96),rgba(8,19,29,0.92))] p-4"
                  >
                    {content}
                  </div>
                );
              })}
              {results.length > visibleResults.length ? (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    className="isu-chip px-4 py-2 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)]"
                  >
                    More results
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
