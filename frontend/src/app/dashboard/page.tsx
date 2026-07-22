"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Search, Trash2, MoreVertical, FileText, X } from "lucide-react";

import { DocsLogo } from "@/components/DocsLogo";
import { getMe, logout, User } from "@/services/auth.service";
import {
  createDocument,
  getDocuments,
  deleteDocument,
  getSharedDocuments,
  downloadDocument,
  Document,
} from "@/services/document.services";

function formatDate(value: string) {
  const d = new Date(value);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function Avatar({ user, size = 32 }: { user: User | null; size?: number }) {
  const initial = (user?.name || user?.email || "U").charAt(0).toUpperCase();
  const bg = "#7e57c2";
  if (user?.avatar) {
    return (
      <span className="gd-avatar" style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatar} alt={user.name} referrerPolicy="no-referrer" />
      </span>
    );
  }
  return (
    <span
      className="gd-avatar"
      style={{ width: size, height: size, background: bg }}
    >
      {initial}
    </span>
  );
}

/** A small faux page thumbnail so cards look like Google Docs. */
function DocThumbnail() {
  return (
    <div className="flex h-40 items-start justify-center overflow-hidden bg-white p-4">
      <div className="w-full space-y-2">
        <div className="h-2 w-1/2 rounded bg-[#e8eaed]" />
        <div className="mt-3 h-1.5 w-full rounded bg-[#f1f3f4]" />
        <div className="h-1.5 w-11/12 rounded bg-[#f1f3f4]" />
        <div className="h-1.5 w-full rounded bg-[#f1f3f4]" />
        <div className="h-1.5 w-4/5 rounded bg-[#f1f3f4]" />
        <div className="h-1.5 w-full rounded bg-[#f1f3f4]" />
        <div className="h-1.5 w-2/3 rounded bg-[#f1f3f4]" />
      </div>
    </div>
  );
}

function DocCard({
  doc,
  onOpen,
  onDelete,
  onDownload,
  badge,
  deleting,
}: {
  doc: Document;
  onOpen: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  onDownload: (format: "pdf" | "txt") => void;
  badge?: string;
  deleting?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      onClick={onOpen}
      className="group relative flex cursor-pointer flex-col rounded-lg border border-[#dadce0] bg-white text-left transition hover:border-[#1a73e8]"
    >
      <div className="overflow-hidden rounded-t-lg border-b border-[#e8eaed]">
        <DocThumbnail />
      </div>
      <div className="flex items-start gap-2 px-4 py-3">
        <FileText size={18} className="mt-0.5 shrink-0 text-[#4285f4]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#202124]">
            {doc.title || "Untitled document"}
          </p>
          <p className="mt-0.5 text-xs text-[#5f6368]">
            {badge ? `${badge} · ` : ""}
            {formatDate(doc.updatedAt)}
          </p>
        </div>

        {/* Overflow menu */}
        <span className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className={`rounded-full p-1.5 text-[#5f6368] transition hover:bg-[#f1f3f4] group-hover:opacity-100 ${
              menuOpen ? "opacity-100" : "opacity-0"
            }`}
            aria-label="More options"
          >
            <MoreVertical size={18} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                }}
              />
              <div
                className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-[#dadce0] bg-white py-1 shadow-[0_4px_20px_rgba(60,64,67,0.2)]"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                  Download
                </p>
                <button
                  onClick={() => {
                    onDownload("pdf");
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#202124] hover:bg-[#f1f3f4]"
                >
                  <FileText size={16} className="text-[#5f6368]" />
                  PDF document (.pdf)
                </button>
                <button
                  onClick={() => {
                    onDownload("txt");
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#202124] hover:bg-[#f1f3f4]"
                >
                  <FileText size={16} className="text-[#5f6368]" />
                  Plain text (.txt)
                </button>

                {onDelete && (
                  <>
                    <div className="my-1 h-px bg-[#e8eaed]" />
                    <button
                      onClick={(e) => {
                        if (deleting) return;
                        onDelete(e);
                        setMenuOpen(false);
                      }}
                      disabled={deleting}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#d93025] hover:bg-[#fce8e6] disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const fetchDocuments = useCallback(async (searchTerm?: string) => {
    try {
      const response = await getDocuments(searchTerm);
      if (response.success && response.documents) {
        setDocuments(response.documents);
      }
    } catch {
      toast.error("Failed to fetch documents");
    }
  }, []);

  const fetchSharedDocuments = useCallback(async () => {
    try {
      const response = await getSharedDocuments();
      if (response.success && response.documents) {
        setSharedDocuments(response.documents);
      }
    } catch {
      toast.error("Failed to fetch shared documents");
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await getMe();
        if (response.success && response.user) {
          setUser(response.user);
          await fetchDocuments();
          await fetchSharedDocuments();
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router, fetchDocuments, fetchSharedDocuments]);

  useEffect(() => {
    if (!user) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchDocuments(search || undefined);
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search, user, fetchDocuments]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out");
      router.push("/login");
    } catch {
      toast.error("Logout failed");
    }
  };

  const handleCreateDocument = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const response = await createDocument();
      if (response.success && response.document) {
        router.push(`/documents/${response.document.id}`);
      } else {
        toast.error("Failed to create document");
      }
    } catch {
      toast.error("Failed to create document");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownload = async (
    docId: string,
    title: string,
    format: "pdf" | "txt"
  ) => {
    try {
      const blob = await downloadDocument(docId, format);
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `${title || "document"}.${format}`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded as ${format.toUpperCase()}`);
    } catch {
      toast.error("Download failed");
    }
  };

  const handleDeleteDocument = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!confirm("Move this document to trash?")) return;

    setDeletingId(docId);
    try {
      const response = await deleteDocument(docId);
      if (response.success) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
        toast.success("Document deleted");
      } else {
        toast.error("Failed to delete document");
      }
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="gd-font flex min-h-screen items-center justify-center text-[#5f6368]">
        Loading…
      </div>
    );
  }

  return (
    <div className="gd-font min-h-screen bg-white text-[#202124]">
      {/* Top app bar */}
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-[#e0e0e0] bg-white px-4 py-2 md:px-6">
        <div className="flex shrink-0 items-center gap-2">
          <DocsLogo size={30} />
          <span className="hidden text-[22px] text-[#5f6368] sm:inline">
            Docs
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 rounded-lg bg-[#f1f3f4] px-4 py-2.5 focus-within:bg-white focus-within:shadow-[0_1px_3px_rgba(60,64,67,0.25)]">
          <Search size={20} className="text-[#5f6368]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-[15px] text-[#202124] outline-none placeholder:text-[#5f6368]"
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search">
              <X size={18} className="text-[#5f6368]" />
            </button>
          )}
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full transition hover:ring-4 hover:ring-[#f1f3f4]"
            aria-label="Account"
          >
            <Avatar user={user} />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-[#dadce0] bg-white shadow-[0_4px_20px_rgba(60,64,67,0.2)]">
                <div className="flex items-center gap-3 border-b border-[#e8eaed] px-4 py-4">
                  <Avatar user={user} size={40} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user?.name}</p>
                    <p className="truncate text-xs text-[#5f6368]">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-left text-sm text-[#202124] hover:bg-[#f1f3f4]"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Start a new document band */}
      <section className="border-b border-[#e0e0e0] bg-[#f1f3f4]">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <h2 className="mb-4 text-sm font-medium text-[#202124]">
            Start a new document
          </h2>
          <button
            onClick={handleCreateDocument}
            disabled={isCreating}
            className="group flex w-[150px] flex-col items-stretch text-left"
          >
            <div className="flex h-[184px] items-center justify-center rounded-lg border border-[#dadce0] bg-white transition group-hover:border-[#1a73e8]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="#1a73e8"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="mt-2 px-1 text-sm font-medium text-[#202124]">
              {isCreating ? "Creating…" : "Blank document"}
            </span>
          </button>
        </div>
      </section>

      {/* Recent documents */}
      <section className="mx-auto max-w-5xl px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-medium text-[#202124]">
            {search ? "Search results" : "Recent documents"}
          </h2>
        </div>

        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#dadce0] py-16 text-center">
            <FileText size={40} className="mb-3 text-[#dadce0]" />
            <p className="text-sm text-[#5f6368]">
              {search
                ? "No documents match your search"
                : "No documents yet — create your first one above"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {documents.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                deleting={deletingId === doc.id}
                onOpen={() => router.push(`/documents/${doc.id}`)}
                onDelete={(e) => handleDeleteDocument(e, doc.id)}
                onDownload={(format) =>
                  handleDownload(doc.id, doc.title, format)
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Shared with me */}
      {sharedDocuments.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 pb-12">
          <h2 className="mb-4 text-base font-medium text-[#202124]">
            Shared with me
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {sharedDocuments.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                badge={(doc as Document & { accessRole?: string }).accessRole}
                onOpen={() => router.push(`/documents/${doc.id}`)}
                onDownload={(format) =>
                  handleDownload(doc.id, doc.title, format)
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
