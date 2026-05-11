"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  AcademicMaterial,
  Course,
  DepartmentDetail,
  GroupSummary,
  getCourses,
  getDepartmentById,
  getGroups,
  getMaterials,
} from "../../../lib/api";
import { clearAccessToken, getAccessToken } from "../../../lib/auth";
import { NotificationBell } from "../../../components/notification-bell";

export default function DepartmentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const departmentId = typeof params?.id === "string" ? params.id : "";
  const [department, setDepartment] = useState<DepartmentDetail | null>(null);
  const [materials, setMaterials] = useState<AcademicMaterial[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/");
      return;
    }
    if (!departmentId) return;
    void bootstrap();
  }, [departmentId, router]);

  async function bootstrap() {
    setLoading(true);
    setError(null);
    try {
      const [departmentData, materialResponse, courseList, groupList] = await Promise.all([
        getDepartmentById(departmentId),
        getMaterials({ departmentId }),
        getCourses(),
        getGroups(),
      ]);

      setDepartment(departmentData);
      setMaterials(materialResponse.items ?? []);
      setCourses(courseList.filter((course) => course.departmentId === departmentId));
      const query = departmentData.name.toLowerCase();
      setGroups(
        groupList.filter((group) =>
          [group.name, group.description]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query)),
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load department.";
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

  const relatedGroupsNote = useMemo(() => {
    if (groups.length > 0) return null;
    return "Group metadata is not explicitly mapped to departments yet, so only matching group names and descriptions are shown here.";
  }, [groups.length]);

  function logout() {
    clearAccessToken();
    router.replace("/");
  }

  return (
    <main className="isu-dashboard-scene relative min-h-screen overflow-x-hidden text-slate-100">
      <div className="isu-soft-pattern pointer-events-none absolute inset-0" />
      <div className="isu-orb left-[-8rem] top-10 h-72 w-72 opacity-58" />
      <div className="isu-orb bottom-[-10rem] right-[-5rem] h-96 w-96 opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-5 lg:px-6">
        <header className="isu-topbar relative mb-5 overflow-hidden rounded-[1.75rem] px-5 py-5">
          <div className="isu-sheen" />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.34em] text-[#7fb7dc]">Department detail</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {department?.name ?? "Department workspace"}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--isu-text-soft)] sm:text-base">
                  Courses, materials, and related groups now sit in one clearer academic overview.
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
                <Link href="/departments" className="isu-button-primary rounded-full px-4 py-2 font-medium">Departments</Link>
                <Link href="/courses" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Courses</Link>
                <Link href="/materials" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Materials</Link>
                <Link href="/groups" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Groups</Link>
              </nav>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Courses</p>
                <p className="mt-3 text-3xl font-semibold text-white">{courses.length}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Active courses mapped to this department.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Materials</p>
                <p className="mt-3 text-3xl font-semibold text-white">{materials.length}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Shared resources already attached here.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Groups</p>
                <p className="mt-3 text-3xl font-semibold text-white">{groups.length}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Matching communities and subject spaces.</p>
              </div>
            </div>
          </div>
        </header>

        {loading ? <p className="text-sm text-slate-400">Loading department...</p> : null}
        {error ? <p className="rounded-2xl border border-rose-800/50 bg-rose-950/20 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

        {!loading && !error && department ? (
          <div className="space-y-5">
            <section className="isu-panel rounded-[1.75rem] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">{department.code || "Department"}</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{department.name}</h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                {department.description || "No department description available."}
              </p>
            </section>

            <div className="grid gap-5 xl:grid-cols-3">
              <section className="isu-panel rounded-[1.75rem] p-5">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <h3 className="text-lg font-semibold text-white">Related courses</h3>
                  <Link href="/courses" className="text-sm text-[#bde4ff] hover:text-white">Browse all</Link>
                </div>
                {courses.length === 0 ? (
                  <p className="text-sm text-slate-400">No active courses found for this department.</p>
                ) : (
                  <div className="space-y-3">
                    {courses.map((course) => (
                      <Link key={course.id} href={`/courses/${course.id}`} className="block rounded-[1.4rem] border border-[rgba(127,183,220,0.14)] bg-[rgba(8,19,29,0.72)] p-4 transition hover:border-[rgba(127,183,220,0.3)]">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{course.code || "Course"}</p>
                        <h4 className="mt-2 font-semibold text-white">{course.name}</h4>
                        <p className="mt-2 text-sm text-[var(--isu-text-soft)]">{course.description || "No course description."}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="isu-panel rounded-[1.75rem] p-5">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <h3 className="text-lg font-semibold text-white">Related materials</h3>
                  <Link href={`/materials?department=${department.id}`} className="text-sm text-[#bde4ff] hover:text-white">
                    Open materials
                  </Link>
                </div>
                {materials.length === 0 ? (
                  <p className="text-sm text-slate-400">No materials have been shared for this department yet.</p>
                ) : (
                  <div className="space-y-3">
                    {materials.slice(0, 8).map((material) => (
                      <Link key={material.id} href={`/materials/${material.id}`} className="block rounded-[1.4rem] border border-[rgba(127,183,220,0.14)] bg-[rgba(8,19,29,0.72)] p-4 transition hover:border-[rgba(127,183,220,0.3)]">
                        <h4 className="font-semibold text-white">{material.title}</h4>
                        <p className="mt-2 text-sm text-[var(--isu-text-soft)]">{material.description || "No description."}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="isu-panel rounded-[1.75rem] p-5">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <h3 className="text-lg font-semibold text-white">Related groups</h3>
                  <Link href="/groups" className="text-sm text-[#bde4ff] hover:text-white">Browse groups</Link>
                </div>
                {groups.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-400">No matching groups found for this department.</p>
                    {relatedGroupsNote ? <p className="text-xs text-slate-500">{relatedGroupsNote}</p> : null}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {groups.map((group) => (
                      <Link key={group.id} href={`/groups/${group.id}`} className="block rounded-[1.4rem] border border-[rgba(127,183,220,0.14)] bg-[rgba(8,19,29,0.72)] p-4 transition hover:border-[rgba(127,183,220,0.3)]">
                        <h4 className="font-semibold text-white">{group.name}</h4>
                        <p className="mt-2 text-sm text-[var(--isu-text-soft)]">{group.description || "No description."}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
