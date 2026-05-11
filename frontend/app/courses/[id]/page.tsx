"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AcademicMaterial, Course, getCourseById, getMaterials } from "../../../lib/api";
import { clearAccessToken, getAccessToken } from "../../../lib/auth";
import { NotificationBell } from "../../../components/notification-bell";

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const courseId = typeof params?.id === "string" ? params.id : "";
  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<AcademicMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/");
      return;
    }
    if (!courseId) return;
    void bootstrap();
  }, [courseId, router]);

  async function bootstrap() {
    setLoading(true);
    setError(null);
    try {
      const [courseData, materialResponse] = await Promise.all([getCourseById(courseId), getMaterials({ courseId })]);
      setCourse(courseData);
      setMaterials(materialResponse.items ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load course.";
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
                <p className="text-xs uppercase tracking-[0.34em] text-[#7fb7dc]">Course detail</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {course?.name ?? "Course workspace"}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--isu-text-soft)] sm:text-base">
                  View course context and the materials already tied to it without forcing users into a dense academic table.
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
                <Link href="/courses" className="isu-button-primary rounded-full px-4 py-2 font-medium">Courses</Link>
                <Link href="/departments" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Departments</Link>
                <Link href="/materials" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Materials</Link>
                <Link href="/chat" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Chat</Link>
              </nav>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Materials</p>
                <p className="mt-3 text-3xl font-semibold text-white">{materials.length}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Linked resources already uploaded for this course.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Code</p>
                <p className="mt-3 text-xl font-semibold text-white">{course?.code || "N/A"}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Current course code used inside the department.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Department</p>
                <p className="mt-3 text-lg font-semibold text-white">{course?.department?.name || "Unmapped"}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Parent department for this course.</p>
              </div>
            </div>
          </div>
        </header>

        {loading ? <p className="text-sm text-slate-400">Loading course...</p> : null}
        {error ? <p className="rounded-2xl border border-rose-800/50 bg-rose-950/20 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

        {!loading && !error && course ? (
          <div className="grid gap-5 xl:grid-cols-[0.92fr,1.08fr]">
            <section className="space-y-5">
              <section className="isu-panel rounded-[1.75rem] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">{course.code || "Course"}</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{course.name}</h2>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  {course.description || "No course description available."}
                </p>
                {course.department ? (
                  <p className="mt-4 text-sm text-slate-400">
                    Department:{" "}
                    <Link href={`/departments/${course.department.id}`} className="text-[#bde4ff] hover:text-white">
                      {course.department.name}
                    </Link>
                  </p>
                ) : null}
              </section>
            </section>

            <section className="isu-panel rounded-[1.75rem] p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Resources</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Related materials</h2>
                </div>
                <Link href="/materials" className="text-sm text-[#bde4ff] hover:text-white">
                  Browse all materials
                </Link>
              </div>
              {materials.length === 0 ? (
                <p className="rounded-[1.4rem] border border-dashed border-[rgba(127,183,220,0.16)] bg-[rgba(8,19,29,0.38)] px-4 py-6 text-sm text-[var(--isu-text-soft)]">
                  No materials have been uploaded for this course yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {materials.map((material) => (
                    <Link
                      key={material.id}
                      href={`/materials/${material.id}`}
                      className="block rounded-[1.4rem] border border-[rgba(127,183,220,0.14)] bg-[rgba(8,19,29,0.72)] p-4 transition hover:border-[rgba(127,183,220,0.3)]"
                    >
                      <h3 className="font-semibold text-white">{material.title}</h3>
                      <p className="mt-2 text-sm text-[var(--isu-text-soft)]">
                        {material.description || "No description."}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
