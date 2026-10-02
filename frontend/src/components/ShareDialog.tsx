"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { X, Check, Globe, Lock, Link2 } from "lucide-react";
import {
  shareDocument,
  getDocumentPermissions,
  setLinkAccess,
  LinkAccess,
  SharedUser,
} from "@/services/document.services";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ShareDialogProps {
  documentId: string;
  open: boolean;
  onClose: () => void;
}

const AVATAR_COLORS = [
  "#6366f1", "#ec4899", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4",
];

const ROLE_ITEMS = { VIEWER: "Viewer", EDITOR: "Editor" };
const GENERAL_ACCESS_ITEMS = { RESTRICTED: "Restricted", ANYONE: "Anyone with the link" };

function colorFor(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function ShareDialog({
  documentId,
  open,
  onClose,
}: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"VIEWER" | "EDITOR">("VIEWER");
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkAccess, setLinkAccessState] = useState<LinkAccess>("RESTRICTED");
  const [savingLinkAccess, setSavingLinkAccess] = useState(false);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await getDocumentPermissions(documentId);
      setSharedUsers(res.permissions);
      setLinkAccessState(res.linkAccess ?? "RESTRICTED");
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to load permissions";
      toast.error(message);
    }
  }, [documentId]);

  useEffect(() => {
    if (open) {
      fetchPermissions();
      setEmail("");
      setRole("VIEWER");
    }
  }, [open, fetchPermissions]);

  const handleShare = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email");
      return;
    }
    setLoading(true);
    try {
      await shareDocument(documentId, { email: email.trim(), role });
      toast.success(`Shared with ${email.trim()}`);
      setEmail("");
      setRole("VIEWER");
      fetchPermissions();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to share document";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkAccessChange = async (next: LinkAccess) => {
    const previous = linkAccess;
    setLinkAccessState(next);
    setSavingLinkAccess(true);
    try {
      await setLinkAccess(documentId, next);
      toast.success(
        next === "RESTRICTED"
          ? "Only people with access can open this link"
          : `Anyone with the link can ${next === "EDITOR" ? "edit" : "view"}`
      );
    } catch (err) {
      setLinkAccessState(previous);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to update link access";
      toast.error(message);
    } finally {
      setSavingLinkAccess(false);
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/documents/${documentId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-base font-semibold text-gray-900">Share document</h2>
          <button
            onClick={onClose}
            className="gd-icon-btn"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Add people */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleShare();
              }}
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white"
            />
            <Select
              items={ROLE_ITEMS}
              value={role}
              onValueChange={(value) => value && setRole(value as "VIEWER" | "EDITOR")}
            >
              <SelectTrigger
                aria-label="Role"
                className="h-9 min-w-24 border-gray-200 bg-gray-50 data-[size=default]:h-9"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIEWER">Viewer</SelectItem>
                <SelectItem value="EDITOR">Editor</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={handleShare}
              disabled={loading}
              className="gd-btn-primary"
              style={{ paddingLeft: 16, paddingRight: 16 }}
            >
              {loading ? "Sharing..." : "Share"}
            </button>
          </div>
        </div>

        {/* People with access */}
        <div className="mt-5 px-5">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
            People with access
          </h3>
          <div className="max-h-56 overflow-y-auto pb-2">
            {sharedUsers.length === 0 ? (
              <p className="py-3 text-sm text-gray-400">
                {linkAccess === "RESTRICTED"
                  ? "Only you have access."
                  : "No one added yet. Anyone with the link can still open it."}
              </p>
            ) : (
              sharedUsers.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-3 py-2"
                >
                  <span
                    className="gd-avatar"
                    style={{ background: colorFor(user.email) }}
                  >
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {user.email}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {user.role === "EDITOR" ? "Editor" : "Viewer"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* General access */}
        <div className="mt-3 border-t border-gray-100 px-5 pt-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
            General access
          </h3>
          <div className="flex items-center gap-3 py-1">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                linkAccess === "RESTRICTED"
                  ? "bg-gray-100 text-gray-500"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {linkAccess === "RESTRICTED" ? <Lock size={16} /> : <Globe size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <Select
                items={GENERAL_ACCESS_ITEMS}
                value={linkAccess === "RESTRICTED" ? "RESTRICTED" : "ANYONE"}
                disabled={savingLinkAccess}
                onValueChange={(value) => {
                  const next = value === "RESTRICTED" ? "RESTRICTED" : "VIEWER";
                  // Picking "Anyone" again shouldn't reset an Editor link back to Viewer
                  if ((next === "RESTRICTED") !== (linkAccess === "RESTRICTED")) {
                    handleLinkAccessChange(next);
                  }
                }}
              >
                <SelectTrigger
                  aria-label="Who can open this link"
                  className="-ml-2 h-7 border-transparent px-2 font-medium text-gray-900 hover:bg-gray-50 data-[size=default]:h-7"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESTRICTED">Restricted</SelectItem>
                  <SelectItem value="ANYONE">Anyone with the link</SelectItem>
                </SelectContent>
              </Select>
              <p className="truncate text-xs text-gray-400">
                {linkAccess === "RESTRICTED"
                  ? "Only people with access can open with the link"
                  : "Anyone on the internet with the link can open it, no sign-in needed"}
              </p>
            </div>
            {linkAccess !== "RESTRICTED" && (
              <Select
                items={ROLE_ITEMS}
                value={linkAccess}
                disabled={savingLinkAccess}
                onValueChange={(value) =>
                  value && value !== linkAccess && handleLinkAccessChange(value as LinkAccess)
                }
              >
                <SelectTrigger
                  aria-label="Link role"
                  className="h-9 min-w-24 border-gray-200 bg-gray-50 data-[size=default]:h-9"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                  <SelectItem value="EDITOR">Editor</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 px-5 py-4">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            <Link2 size={14} />
            Copy link
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Check size={14} />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
