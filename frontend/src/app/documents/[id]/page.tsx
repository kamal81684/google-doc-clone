"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Star, MessageSquare, MoreVertical, Lock } from "lucide-react";

import {
  getDocumentById,
  updateDocument,
  downloadDocument,
} from "@/services/document.services";
import type { Document as DocumentData } from "@/services/document.services";

import { useCollaboration } from "@/hooks/useCollaboration";
import DocumentEditor from "@/components/editor/DocumentEditor";
import ShareDialog from "@/components/ShareDialog";
import { DocsLogo } from "@/components/DocsLogo";

const MENU_ITEMS = ["File", "Edit", "View", "Insert", "Format", "Tools", "Help"];

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const typedError = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    return typedError.response?.data?.message || typedError.message || fallback;
  }
  return fallback;
}

interface PresenceUser {
  clientId: number;
  name: string;
  color: string;
}

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [document, setDocument] = useState<DocumentData | null>(null);
  const [title, setTitle] = useState("");
  const [accessRole, setAccessRole] = useState<
    "OWNER" | "EDITOR" | "VIEWER" | null
  >(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [userName, setUserName] = useState("Anonymous");
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [peers, setPeers] = useState<PresenceUser[]>([]);

  const previousTitle = useRef(title);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await getDocumentById(id);
        setDocument(response.document);
        setTitle(response.document.title);
        setAccessRole(response.document.accessRole);
        previousTitle.current = response.document.title;
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to load document"));
      }
    };
    fetchDocument();
  }, [id]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(
          `${
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
          }/auth/me`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (data.user?.name) {
          setUserName(data.user.name);
        }
      } catch {
        // keep default "Anonymous"
      }
    };
    fetchUser();
  }, []);

  const { provider, doc, isSynced } = useCollaboration({
    documentId: id,
    userName,
  });

  // Live collaborator presence (from Yjs awareness)
  useEffect(() => {
    if (!provider) return;
    const awareness = provider.awareness;

    const update = () => {
      // Awareness can fire synchronously while the editor initializes during
      // render; defer the state update so we never setState mid-render.
      queueMicrotask(() => {
        const list: PresenceUser[] = [];
        awareness.getStates().forEach((state, clientId) => {
          const u = (state as { user?: { name?: string; color?: string } })
            .user;
          if (u?.name) {
            list.push({
              clientId,
              name: u.name,
              color: u.color || "#5f6368",
            });
          }
        });
        setPeers(list);
      });
    };

    update();
    awareness.on("change", update);
    return () => {
      awareness.off("change", update);
    };
  }, [provider]);

  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      setSaveState("saving");

      if (titleTimer.current) clearTimeout(titleTimer.current);

      titleTimer.current = setTimeout(async () => {
        try {
          await updateDocument(id, { title: newTitle });
          previousTitle.current = newTitle;
          setSaveState("saved");
        } catch (error: unknown) {
          toast.error(getErrorMessage(error, "Failed to save title"));
          setTitle(previousTitle.current);
          setSaveState("saved");
        }
      }, 1000);
    },
    [id]
  );

  useEffect(() => {
    return () => {
      if (titleTimer.current) clearTimeout(titleTimer.current);
    };
  }, []);

  const handleDownload = useCallback(
    async (format: "txt" | "pdf") => {
      setDownloadOpen(false);
      try {
        const blob = await downloadDocument(id, format);
        const url = window.URL.createObjectURL(blob);
        const link = window.document.createElement("a");
        link.href = url;
        link.download = `${title || "document"}.${format}`;
        window.document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success(`Downloaded as ${format.toUpperCase()}`);
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "Download failed"));
      }
    },
    [id, title]
  );

  const canEdit = accessRole === "OWNER" || accessRole === "EDITOR";

  if (!document || !isSynced || !provider || !doc) {
    return (
      <div className="gd-font flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f9fbfd]">
        <DocsLogo size={48} />
        <p className="text-sm text-[#5f6368]">Loading document…</p>
      </div>
    );
  }

  return (
    <div className="gd-font flex h-screen flex-col bg-[#f9fbfd]">
      {/* Top app bar */}
      <header className="flex items-center gap-3 bg-white px-4 py-2">
        <button
          onClick={() => router.push("/dashboard")}
          className="shrink-0"
          aria-label="Home"
        >
          <DocsLogo size={40} />
        </button>

        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-center gap-2">
            <input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              readOnly={!canEdit}
              placeholder="Untitled document"
              className="max-w-full truncate rounded border border-transparent px-1 text-[18px] text-[#202124] outline-none hover:border-[#dadce0] focus:border-[#1a73e8] read-only:hover:border-transparent"
              style={{ width: `${Math.max(title.length + 2, 8)}ch` }}
            />
            {canEdit && (
              <>
                <button
                  className="gd-icon-btn"
                  aria-label="Star"
                  title="Star"
                >
                  <Star size={18} />
                </button>
                {saveState === "saving" ? (
                  <span className="text-xs text-[#5f6368]">Saving…</span>
                ) : (
                  <span className="text-xs text-[#5f6368]">Saved</span>
                )}
              </>
            )}
            {!canEdit && (
              <span className="flex items-center gap-1 rounded-full bg-[#f1f3f4] px-2 py-0.5 text-xs text-[#5f6368]">
                <Lock size={12} /> View only
              </span>
            )}
          </div>

          {/* Menu bar */}
          <div className="-ml-1 mt-0.5 flex items-center gap-0.5">
            {MENU_ITEMS.map((item) => (
              <button key={item} className="gd-menu-item">
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Presence avatars */}
          {peers.length > 1 && (
            <div className="mr-1 flex -space-x-2">
              {peers.slice(0, 4).map((p) => (
                <span
                  key={p.clientId}
                  className="gd-avatar border-2 border-white"
                  style={{ width: 30, height: 30, background: p.color }}
                  title={p.name}
                >
                  {p.name.charAt(0).toUpperCase()}
                </span>
              ))}
            </div>
          )}

          <button className="gd-icon-btn" title="Comments" aria-label="Comments">
            <MessageSquare size={20} />
          </button>

          {/* Download menu */}
          <div className="relative">
            <button
              className="gd-icon-btn"
              onClick={() => setDownloadOpen((v) => !v)}
              aria-label="More"
              title="Download"
            >
              <MoreVertical size={20} />
            </button>
            {downloadOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setDownloadOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-[#dadce0] bg-white py-1 shadow-[0_4px_20px_rgba(60,64,67,0.2)]">
                  <p className="px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                    Download
                  </p>
                  <button
                    onClick={() => handleDownload("txt")}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-[#f1f3f4]"
                  >
                    Plain text (.txt)
                  </button>
                  <button
                    onClick={() => handleDownload("pdf")}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-[#f1f3f4]"
                  >
                    PDF document (.pdf)
                  </button>
                </div>
              </>
            )}
          </div>

          {accessRole === "OWNER" && (
            <button className="gd-btn-primary" onClick={() => setShareOpen(true)}>
              <Lock size={16} />
              Share
            </button>
          )}
        </div>
      </header>

      <DocumentEditor
        provider={provider}
        doc={doc}
        userName={userName}
        readOnly={!canEdit}
      />

      <ShareDialog
        documentId={id}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}
