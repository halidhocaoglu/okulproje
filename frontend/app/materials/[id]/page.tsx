"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  AcademicMaterial,
  ApiError,
  Department,
  MaterialComment,
  UserProfile,
  addMaterialComment,
  bookmarkMaterial,
  deleteMaterial,
  getCurrentUser,
  getDepartments,
  getMaterialById,
  getMaterialComments,
  removeMaterialBookmark,
  removeMaterialVote,
  reportMaterial,
  updateMaterial,
  voteMaterial,
} from "../../../lib/api";
import { clearAccessToken, getAccessToken } from "../../../lib/auth";
import { NotificationBell } from "../../../components/notification-bell";

type ReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "inappropriate_content"
  | "copyright"
  | "misinformation"
  | "other";

export default function MaterialDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const materialId = params.id;

  const [material, setMaterial] = useState<AcademicMaterial | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [comments, setComments] = useState<MaterialComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState("");
  const [editCourseId, setEditCourseId] = useState("");
  const [editTags, setEditTags] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("inappropriate_content");
  const [reportDescription, setReportDescription] = useState("Reported from frontend test");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/");
      return;
    }

    void bootstrapPage();
  }, [router, materialId]);

  const canManageMaterial = useMemo(() => {
    if (!material || !currentUser) return false;
    if (material.uploaderId && material.uploaderId === currentUser.id) return true;
    return ["super_admin", "school_admin", "moderator"].includes(currentUser.role ?? "");
  }, [currentUser, material]);

  const statTags = material?.tags?.length ?? 0;
  const statVotes = material?.voteCount ?? 0;
  const statComments = comments.length;

  async function bootstrapPage() {
    setLoading(true);
    setError(null);
    try {
      const [user, detail, commentsResponse, departmentsResponse] = await Promise.all([
        getCurrentUser(),
        getMaterialById(materialId),
        getMaterialComments(materialId),
        getDepartments(),
      ]);
      setCurrentUser(user);
      setDepartments(departmentsResponse);
      setComments(commentsResponse.items ?? []);
      applyMaterialState(detail);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err instanceof ApiError && err.status === 404 ? "Material not found." : "Failed to load material detail.");
    } finally {
      setLoading(false);
      setCommentLoading(false);
    }
  }

  function applyMaterialState(data: AcademicMaterial) {
    setMaterial(data);
    setIsBookmarked(Boolean(data.isBookmarked));
    setHasVoted((data.myVote ?? 0) > 0);
    setEditTitle(data.title ?? "");
    setEditDescription(data.description ?? "");
    setEditDepartmentId(data.departmentId ?? "");
    setEditCourseId(data.courseId ?? "");
    setEditTags((data.tags ?? []).map((tag) => tag.name).join(", "));
  }

  function ensureToken() {
    const token = getAccessToken();
    if (!token) {
      router.replace("/");
      return false;
    }
    return true;
  }

  function handleAuthError(err: unknown) {
    const message =
      err instanceof ApiError
        ? `${err.status}:${err.message}`
        : err instanceof Error
          ? err.message
          : "";
    if (message.includes("NO_TOKEN") || message.includes("401") || message.includes("Unauthorized")) {
      clearAccessToken();
      router.replace("/");
      return true;
    }
    return false;
  }

  function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  function parseTags(value: string) {
    return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];
  }

  async function onSubmitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!commentInput.trim() || !ensureToken()) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await addMaterialComment(materialId, commentInput.trim());
      setComments((prev) => [...prev, created]);
      setCommentInput("");
      setSuccess("Comment added.");
    } catch (err) {
      if (handleAuthError(err)) return;
      setError("Failed to add comment.");
    } finally {
      setActionLoading(false);
    }
  }

  async function onVote() {
    if (!ensureToken()) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (hasVoted) {
        await removeMaterialVote(materialId);
        setHasVoted(false);
        setMaterial((prev) =>
          prev
            ? {
                ...prev,
                myVote: 0,
                voteCount: Math.max((prev.voteCount ?? 1) - 1, 0),
                voteScore: Math.max((prev.voteScore ?? 1) - 1, 0),
              }
            : prev,
        );
      } else {
        await voteMaterial(materialId, 1);
        setHasVoted(true);
        setMaterial((prev) =>
          prev
            ? {
                ...prev,
                myVote: 1,
                voteCount: (prev.voteCount ?? 0) + 1,
                voteScore: (prev.voteScore ?? 0) + 1,
              }
            : prev,
        );
      }
    } catch (err) {
      if (handleAuthError(err)) return;
      setError("Vote action failed.");
    } finally {
      setActionLoading(false);
    }
  }

  async function onBookmark() {
    if (!ensureToken()) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (isBookmarked) {
        await removeMaterialBookmark(materialId);
        setIsBookmarked(false);
        setMaterial((prev) => (prev ? { ...prev, isBookmarked: false, bookmarkedByMe: false } : prev));
      } else {
        await bookmarkMaterial(materialId);
        setIsBookmarked(true);
        setMaterial((prev) => (prev ? { ...prev, isBookmarked: true, bookmarkedByMe: true } : prev));
      }
    } catch (err) {
      if (handleAuthError(err)) return;
      setError("Bookmark action failed.");
    } finally {
      setActionLoading(false);
    }
  }

  async function onReport() {
    if (!ensureToken()) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await reportMaterial(materialId, reportReason, reportDescription.trim());
      setSuccess("Material reported.");
    } catch (err) {
      if (handleAuthError(err)) return;
      setError("Report failed.");
    } finally {
      setActionLoading(false);
    }
  }

  async function onSaveMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!material || !canManageMaterial || !ensureToken()) return;

    const normalizedTitle = editTitle.trim();
    if (!normalizedTitle) {
      setError("Title is required.");
      return;
    }

    const safeDepartmentId = editDepartmentId.trim();
    const safeCourseId = editCourseId.trim();

    setSaveLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateMaterial(material.id, {
        title: normalizedTitle,
        description: editDescription.trim() || undefined,
        departmentId: safeDepartmentId && isUuid(safeDepartmentId) ? safeDepartmentId : undefined,
        courseId: safeCourseId && isUuid(safeCourseId) ? safeCourseId : undefined,
        tags: parseTags(editTags),
      });
      applyMaterialState(updated);
      setIsEditing(false);
      setSuccess("Material updated.");
    } catch (err) {
      if (handleAuthError(err)) return;
      if (err instanceof ApiError && err.status === 403) {
        setError("Only the uploader or a moderator can edit this material.");
      } else {
        setError("Failed to update material.");
      }
    } finally {
      setSaveLoading(false);
    }
  }

  async function onDeleteMaterial() {
    if (!material || !canManageMaterial || !ensureToken()) return;

    setDeleteLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteMaterial(material.id);
      router.replace("/materials?deleted=1");
    } catch (err) {
      if (handleAuthError(err)) return;
      if (err instanceof ApiError && err.status === 403) {
        setError("Only the uploader or a moderator can delete this material.");
      } else {
        setError("Failed to delete material.");
      }
      setDeleteLoading(false);
    }
  }

  function formatDate(value?: string | null) {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  }

  function logout() {
    clearAccessToken();
    router.replace("/");
  }

  return (
    <main className="materials-scene relative min-h-screen overflow-x-hidden text-slate-100">
      <div className="materials-pattern pointer-events-none absolute inset-0" />
      <div className="isu-orb left-[-8rem] top-10 h-72 w-72 opacity-60" />
      <div className="isu-orb bottom-[-10rem] right-[-5rem] h-96 w-96 opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-5 lg:px-6">
        <header className="isu-topbar relative mb-5 overflow-hidden rounded-[1.75rem] px-5 py-5">
          <div className="isu-sheen" />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.34em] text-[#7fb7dc]">Material detail</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {material?.title ?? "Resource detail"}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--isu-text-soft)] sm:text-base)">
                  Review comments, edit metadata, and manage signals like votes and bookmarks in one calmer workspace.
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
                <Link href="/materials" className="isu-button-primary rounded-full px-4 py-2 font-medium">Materials</Link>
                <Link href="/search" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Search</Link>
                <Link href="/departments" className="isu-chip rounded-full px-4 py-2 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Departments</Link>
              </nav>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Votes</p>
                <p className="mt-3 text-3xl font-semibold text-white">{statVotes}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Current community endorsement count.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Comments</p>
                <p className="mt-3 text-3xl font-semibold text-white">{statComments}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Discussion entries attached to this item.</p>
              </div>

              <div className="isu-stat-card rounded-[1.4rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Tags</p>
                <p className="mt-3 text-3xl font-semibold text-white">{statTags}</p>
                <p className="mt-2 text-sm text-[var(--isu-text-soft)]">Label count for discovery and filtering.</p>
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <section className="isu-panel rounded-[1.75rem] p-6 text-sm text-slate-400">Loading material...</section>
        ) : !material ? (
          <section className="isu-panel rounded-[1.75rem] p-6 text-sm text-slate-400">Material not found.</section>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[1.05fr,0.95fr]">
            <section className="space-y-5">
              <section className="isu-panel rounded-[1.75rem] p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">
                      Uploaded by {material.uploader?.fullName || material.uploader?.username || "Unknown User"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span>Created: {formatDate(material.createdAt)}</span>
                      <span>Updated: {formatDate(material.updatedAt ?? material.createdAt)}</span>
                    </div>
                  </div>
                  {canManageMaterial ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setIsEditing((prev) => !prev);
                          setConfirmDelete(false);
                          setError(null);
                          setSuccess(null);
                        }}
                        className="isu-chip rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)]"
                      >
                        {isEditing ? "Cancel Edit" : "Edit"}
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDelete(true);
                          setIsEditing(false);
                          setError(null);
                          setSuccess(null);
                        }}
                        className="rounded-full border border-rose-400/35 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>

                {!isEditing ? (
                  <>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                      {material.description || "No description."}
                    </p>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <div className="isu-subtle-card rounded-[1.4rem] px-4 py-4 text-sm text-slate-300">
                        <p><span className="text-slate-400">Department:</span> {material.department?.name || material.departmentId || "-"}</p>
                        <p className="mt-2"><span className="text-slate-400">Course:</span> {material.course?.name || material.courseId || "-"}</p>
                        <p className="mt-2"><span className="text-slate-400">Bookmarked:</span> {isBookmarked ? "Yes" : "No"}</p>
                      </div>
                      <div className="isu-subtle-card rounded-[1.4rem] px-4 py-4">
                        {material.tags?.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {material.tags.map((tag, index) => (
                              <span
                                key={`${material.id}-detail-tag-${tag.name}-${index}`}
                                className="rounded-full bg-[rgba(56,128,176,0.14)] px-2 py-0.5 text-[11px] text-[#b4d8ee]"
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">No tags yet.</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <form onSubmit={onSaveMaterial} className="grid gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Title</span>
                      <input
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        className="isu-input w-full rounded-2xl px-4 py-3 text-sm"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Description</span>
                      <textarea
                        value={editDescription}
                        onChange={(event) => setEditDescription(event.target.value)}
                        rows={4}
                        className="isu-input w-full rounded-2xl px-4 py-3 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Department</span>
                      <select
                        value={editDepartmentId}
                        onChange={(event) => setEditDepartmentId(event.target.value)}
                        className="isu-input w-full rounded-2xl bg-[rgba(8,19,29,0.94)] px-4 py-3 text-sm text-slate-100"
                      >
                        <option value="" className="bg-[#0b1722] text-slate-100">No department</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id} className="bg-[#0b1722] text-slate-100">
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Course ID</span>
                      <input
                        value={editCourseId}
                        onChange={(event) => setEditCourseId(event.target.value)}
                        placeholder="Optional course UUID"
                        className="isu-input w-full rounded-2xl px-4 py-3 text-sm"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Tags</span>
                      <input
                        value={editTags}
                        onChange={(event) => setEditTags(event.target.value)}
                        placeholder="comma, separated, tags"
                        className="isu-input w-full rounded-2xl px-4 py-3 text-sm"
                      />
                    </label>
                    <div className="sm:col-span-2 flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={saveLoading}
                        className="isu-button-primary rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-70"
                      >
                        {saveLoading ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (material) {
                            applyMaterialState(material);
                          }
                          setIsEditing(false);
                        }}
                        className="isu-chip rounded-2xl px-5 py-3 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={onVote}
                    disabled={actionLoading}
                    className="isu-button-primary rounded-full px-4 py-2 text-sm font-medium disabled:opacity-70"
                  >
                    {hasVoted ? "Remove Vote" : "Vote"}
                  </button>
                  <button
                    onClick={onBookmark}
                    disabled={actionLoading}
                    className="isu-chip rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)] disabled:opacity-70"
                  >
                    {isBookmarked ? "Remove Bookmark" : "Bookmark"}
                  </button>
                  <button
                    onClick={onReport}
                    disabled={actionLoading}
                    className="rounded-full border border-rose-400/35 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/10 disabled:opacity-70"
                  >
                    Report
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Report reason</span>
                    <select
                      value={reportReason}
                      onChange={(event) => setReportReason(event.target.value as ReportReason)}
                      className="isu-input w-full rounded-2xl bg-[rgba(8,19,29,0.94)] px-4 py-3 text-sm text-slate-100"
                    >
                      <option value="inappropriate_content" className="bg-[#0b1722] text-slate-100">Inappropriate content</option>
                      <option value="spam" className="bg-[#0b1722] text-slate-100">Spam</option>
                      <option value="harassment" className="bg-[#0b1722] text-slate-100">Harassment</option>
                      <option value="hate_speech" className="bg-[#0b1722] text-slate-100">Hate speech</option>
                      <option value="copyright" className="bg-[#0b1722] text-slate-100">Copyright</option>
                      <option value="misinformation" className="bg-[#0b1722] text-slate-100">Misinformation</option>
                      <option value="other" className="bg-[#0b1722] text-slate-100">Other</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Report description</span>
                    <input
                      value={reportDescription}
                      onChange={(event) => setReportDescription(event.target.value)}
                      className="isu-input w-full rounded-2xl px-4 py-3 text-sm"
                    />
                  </label>
                </div>

                {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
                {success ? <p className="mt-4 text-sm text-emerald-400">{success}</p> : null}
              </section>
            </section>

            <section className="space-y-5">
              <section className="isu-panel rounded-[1.75rem] p-5">
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#7fb7dc]">Discussion</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Comments</h2>
                </div>
                <form onSubmit={onSubmitComment} className="mb-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={commentInput}
                    onChange={(event) => setCommentInput(event.target.value)}
                    placeholder="Write a comment..."
                    className="isu-input flex-1 rounded-2xl px-4 py-3 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={actionLoading || !commentInput.trim()}
                    className="isu-button-primary rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-70 sm:min-w-[140px]"
                  >
                    Comment
                  </button>
                </form>

                {commentLoading ? (
                  <p className="text-sm text-slate-400">Loading comments...</p>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-slate-400">No comments yet.</p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <article
                        key={comment.id}
                        className="rounded-[1.4rem] border border-[rgba(127,183,220,0.12)] bg-[rgba(8,19,29,0.76)] p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-400">
                          <span>{comment.user?.fullName || comment.user?.username || "Unknown User"}</span>
                          <span>{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm leading-6 text-slate-200">{comment.content}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </section>
          </div>
        )}
      </div>

      {confirmDelete && material ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="isu-panel w-full max-w-md rounded-[1.75rem] p-5 shadow-[0_20px_80px_rgba(8,19,29,0.45)]">
            <h2 className="text-lg font-semibold">Delete material?</h2>
            <p className="mt-2 text-sm text-slate-400">
              This will remove <span className="text-slate-200">{material.title}</span> from the materials feed.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="isu-chip rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)]"
              >
                Cancel
              </button>
              <button
                onClick={onDeleteMaterial}
                disabled={deleteLoading}
                className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
