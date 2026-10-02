"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { isAxiosError } from "axios";
import {
  Search,
  Trash2,
  MoreVertical,
  FileText,
  X,
  Plus,
  Sparkles,
  MessageSquare,
  Folder as FolderIcon,
  FolderPlus,
  FolderInput,
  Pencil,
  LogOut,
} from "lucide-react";

import { DocsLogo } from "@/components/DocsLogo";
import { ChatPanel } from "@/components/ChatPanel";
import { OrganizeDialog } from "@/components/OrganizeDialog";
import { useConfirm } from "@/components/ConfirmProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getMe, logout, User } from "@/services/auth.service";
import {
  createDocument,
  getDocuments,
  deleteDocument,
  getSharedDocuments,
  downloadDocument,
  moveDocumentToFolder,
  Document,
} from "@/services/document.services";
import {
  createFolder,
  deleteFolder,
  getFolders,
  renameFolder,
  Folder,
} from "@/services/folder.service";
import { AiStatus, getAiStatus } from "@/services/ai.service";

// "all" | "unfiled" | a folder id
type FolderFilter = string;

function apiErrorMessage(error: unknown, fallback: string): string {
  return (isAxiosError(error) && error.response?.data?.message) || fallback;
}

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
  const bg = "#6366f1";
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

function DocCard({
  doc,
  onOpen,
  onDelete,
  onDownload,
  onMove,
  folders,
  badge,
  deleting,
}: {
  doc: Document;
  onOpen: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  onDownload: (format: "pdf" | "txt") => void;
  onMove?: (folderId: string | null) => void;
  folders?: Folder[];
  badge?: string;
  deleting?: boolean;
}) {
  const folderName = folders?.find((f) => f.id === doc.folderId)?.name;

  return (
    <div
      onClick={onOpen}
      className="group relative flex cursor-pointer flex-col rounded-lg border border-gray-200 bg-white text-left transition hover:border-indigo-300 hover:shadow-sm"
    >
      <div className="flex items-start gap-3 px-4 py-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
          <FileText size={18} className="text-indigo-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words text-sm font-medium text-gray-900">
            {doc.title || "Untitled document"}
          </p>
          <p className="mt-1 truncate text-xs text-gray-400">
            {badge ? `${badge} · ` : ""}
            {formatDate(doc.updatedAt)}
            {folderName ? ` · ${folderName}` : ""}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            // The card itself opens the document; keep menu clicks from reaching it
            onClick={(e) => e.stopPropagation()}
            className="rounded-md p-1.5 text-gray-400 opacity-0 transition outline-none hover:bg-gray-100 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-indigo-200 data-popup-open:bg-gray-100 data-popup-open:opacity-100"
            aria-label="More options"
          >
            <MoreVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52"
            // React events bubble through portals, so stop them at the menu too
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>Download</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onDownload("pdf")}>
                <FileText size={14} className="text-gray-400" />
                PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload("txt")}>
                <FileText size={14} className="text-gray-400" />
                Plain text
              </DropdownMenuItem>
            </DropdownMenuGroup>

            {onMove && folders && (folders.length > 0 || doc.folderId) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderInput size={14} className="text-gray-400" />
                    Move to folder
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    className="max-h-64 w-48"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {folders
                      .filter((f) => f.id !== doc.folderId)
                      .map((f) => (
                        <DropdownMenuItem key={f.id} onClick={() => onMove(f.id)}>
                          <FolderIcon size={14} className="text-gray-400" />
                          <span className="truncate">{f.name}</span>
                        </DropdownMenuItem>
                      ))}
                    {doc.folderId && (
                      <>
                        {folders.length > 1 && <DropdownMenuSeparator />}
                        <DropdownMenuItem onClick={() => onMove(null)}>
                          <X size={14} className="text-gray-400" />
                          Remove from folder
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </>
            )}

            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={deleting}
                  onClick={(e) => onDelete(e)}
                >
                  <Trash2 size={14} />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<FolderFilter>("all");
  const [folderNameDraft, setFolderNameDraft] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const confirm = useConfirm();
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

  const fetchFolders = useCallback(async () => {
    try {
      const response = await getFolders();
      if (response.success && response.folders) {
        setFolders(response.folders);
      }
    } catch {
      toast.error("Failed to fetch folders");
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
          await fetchFolders();
          // Also starts indexing documents in the background for chat
          getAiStatus()
            .then(setAiStatus)
            .catch(() => setAiStatus(null));
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
  }, [router, fetchDocuments, fetchSharedDocuments, fetchFolders]);

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
    const doc = documents.find((d) => d.id === docId);
    const confirmed = await confirm({
      title: "Delete this document?",
      description: doc?.title
        ? `"${doc.title}" will be permanently deleted. This can't be undone.`
        : "This document will be permanently deleted. This can't be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;

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

  const handleMoveDocument = async (docId: string, folderId: string | null) => {
    try {
      await moveDocumentToFolder(docId, folderId);
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === docId ? { ...doc, folderId } : doc))
      );
      fetchFolders();
      const target = folders.find((f) => f.id === folderId);
      toast.success(target ? `Moved to ${target.name}` : "Removed from folder");
    } catch {
      toast.error("Failed to move document");
    }
  };

  const handleCreateFolder = async () => {
    const name = folderNameDraft?.trim();
    if (!name) {
      setFolderNameDraft(null);
      return;
    }
    try {
      const response = await createFolder(name);
      setFolderNameDraft(null);
      await fetchFolders();
      setActiveFolder(response.folder.id);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to create folder"));
    }
  };

  const handleRenameFolder = async (folderId: string) => {
    const name = renameDraft?.trim();
    setRenameDraft(null);
    if (!name) return;
    try {
      await renameFolder(folderId, name);
      await fetchFolders();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to rename folder"));
    }
  };

  const handleDeleteFolder = async (folder: Folder) => {
    const confirmed = await confirm({
      title: `Delete the folder "${folder.name}"?`,
      description: "Its documents won't be deleted; they'll become unfiled.",
      confirmLabel: "Delete folder",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteFolder(folder.id);
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.folderId === folder.id ? { ...doc, folderId: null } : doc
        )
      );
      setActiveFolder("all");
      await fetchFolders();
      toast.success("Folder deleted");
    } catch {
      toast.error("Failed to delete folder");
    }
  };

  const activeFolderObj = folders.find((f) => f.id === activeFolder);
  const unfiledCount = documents.filter((doc) => !doc.folderId).length;
  const visibleDocuments = documents.filter((doc) =>
    activeFolder === "all"
      ? true
      : activeFolder === "unfiled"
        ? !doc.folderId
        : doc.folderId === activeFolder
  );

  if (isLoading) {
    return (
      <div className="app-font flex min-h-screen items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="app-font min-h-screen bg-[#fafafa] text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-2 md:px-6">
        <div className="flex shrink-0 items-center gap-2">
          <DocsLogo size={26} />
          <span className="hidden text-base font-semibold text-gray-900 sm:inline">
            Docs
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-xl items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-indigo-300 focus-within:bg-white">
          <Search size={16} className="text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search">
              <X size={16} className="text-gray-400" />
            </button>
          )}
        </div>

        <button
          onClick={() => setChatOpen((v) => !v)}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition ${
            chatOpen
              ? "border-indigo-300 bg-indigo-50 text-indigo-600"
              : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
          }`}
          aria-label="Chat with your docs"
          title="Chat with your docs"
        >
          <MessageSquare size={16} />
          <span className="hidden md:inline">Ask your docs</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="shrink-0 rounded-full transition outline-none hover:ring-2 hover:ring-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-200 data-popup-open:ring-2 data-popup-open:ring-gray-200"
            aria-label="Account"
          >
            <Avatar user={user} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar user={user} size={36} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user?.name}</p>
                <p className="truncate text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut size={14} className="text-gray-400" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* New document */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <button
            onClick={handleCreateDocument}
            disabled={isCreating}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-5 py-3 text-sm font-medium text-gray-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
          >
            <Plus size={18} />
            {isCreating ? "Creating..." : "New document"}
          </button>
          {aiStatus?.chatEnabled && unfiledCount > 1 && (
            <button
              onClick={() => setOrganizeOpen(true)}
              className="ml-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
            >
              <Sparkles size={16} />
              Organize with AI
            </button>
          )}
        </div>
      </section>

      {/* Recent documents */}
      <section className="mx-auto max-w-4xl px-6 py-6">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {[
            { id: "all", name: "All", count: documents.length },
            ...(folders.length > 0
              ? [{ id: "unfiled", name: "Unfiled", count: unfiledCount }]
              : []),
            ...folders.map((f) => ({
              id: f.id,
              name: f.name,
              count: f.documentCount,
            })),
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => {
                setActiveFolder(chip.id);
                setRenameDraft(null);
              }}
              className={`inline-flex max-w-[220px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                activeFolder === chip.id
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {chip.id !== "all" && chip.id !== "unfiled" && (
                <FolderIcon size={12} className="shrink-0" />
              )}
              <span className="truncate">{chip.name}</span>
              <span className="text-gray-400">{chip.count}</span>
            </button>
          ))}

          {folderNameDraft !== null ? (
            <input
              autoFocus
              value={folderNameDraft}
              onChange={(e) => setFolderNameDraft(e.target.value)}
              onBlur={handleCreateFolder}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") setFolderNameDraft(null);
              }}
              maxLength={60}
              placeholder="Folder name"
              className="w-36 rounded-full border border-indigo-300 bg-white px-3 py-1 text-xs outline-none"
            />
          ) : (
            <button
              onClick={() => setFolderNameDraft("")}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
            >
              <FolderPlus size={13} />
              New folder
            </button>
          )}
        </div>

        <div className="mb-4 flex items-center gap-2">
          {activeFolderObj && renameDraft !== null ? (
            <input
              autoFocus
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onBlur={() => handleRenameFolder(activeFolderObj.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameFolder(activeFolderObj.id);
                if (e.key === "Escape") setRenameDraft(null);
              }}
              maxLength={60}
              className="rounded-md border border-indigo-300 px-2 py-0.5 text-sm outline-none"
            />
          ) : (
            <h2 className="text-sm font-medium text-gray-500">
              {search
                ? "Search results"
                : activeFolderObj
                  ? activeFolderObj.name
                  : activeFolder === "unfiled"
                    ? "Unfiled documents"
                    : "Recent documents"}
            </h2>
          )}
          {activeFolderObj && renameDraft === null && (
            <>
              <button
                onClick={() => setRenameDraft(activeFolderObj.name)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Rename folder"
                title="Rename folder"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => handleDeleteFolder(activeFolderObj)}
                className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Delete folder"
                title="Delete folder"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>

        {visibleDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-16 text-center">
            <FileText size={36} className="mb-3 text-gray-300" />
            <p className="text-sm text-gray-400">
              {search
                ? "No documents match your search"
                : activeFolder !== "all"
                  ? "No documents here yet. Use a document's ⋮ menu to move it into this folder."
                  : "No documents yet. Create your first one above."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleDocuments.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                folders={folders}
                onMove={(folderId) => handleMoveDocument(doc.id, folderId)}
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
      {sharedDocuments.length > 0 && activeFolder === "all" && (
        <section className="mx-auto max-w-4xl px-6 pb-12">
          <h2 className="mb-4 text-sm font-medium text-gray-500">
            Shared with me
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        status={aiStatus}
      />

      {organizeOpen && (
        <OrganizeDialog
          onClose={() => setOrganizeOpen(false)}
          onApplied={() => {
            fetchDocuments(search || undefined);
            fetchFolders();
          }}
        />
      )}
    </div>
  );
}
