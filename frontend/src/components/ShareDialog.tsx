"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { X, Check } from "lucide-react";
import {
  shareDocument,
  getDocumentPermissions,
  SharedUser,
} from "@/services/document.services";

interface ShareDialogProps {
  documentId: string;
  open: boolean;
  onClose: () => void;
}

const AVATAR_COLORS = [
  "#1a73e8", "#d93025", "#188038", "#e37400", "#7e57c2", "#00897b",
];

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

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await getDocumentPermissions(documentId);
      setSharedUsers(res.permissions);
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

  if (!open) return null;

  return (
    <div className="gd-font fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="text-xl font-normal text-[#202124]">Share document</h2>
          <button
            onClick={onClose}
            className="gd-icon-btn"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Add people */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder="Add people by email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleShare();
              }}
              className="flex-1 rounded-md border border-[#dadce0] px-3 py-2.5 text-sm outline-none focus:border-[#1a73e8]"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "VIEWER" | "EDITOR")}
              className="rounded-md border border-[#dadce0] px-2 py-2.5 text-sm outline-none focus:border-[#1a73e8]"
            >
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
            </select>
            <button
              onClick={handleShare}
              disabled={loading}
              className="gd-btn-primary"
              style={{ paddingLeft: 20, paddingRight: 20 }}
            >
              {loading ? "Sharing…" : "Share"}
            </button>
          </div>
        </div>

        {/* People with access */}
        <div className="mt-5 px-6">
          <h3 className="mb-1 text-sm font-medium text-[#202124]">
            People with access
          </h3>
          <div className="max-h-64 overflow-y-auto pb-2">
            {sharedUsers.length === 0 ? (
              <p className="py-3 text-sm text-[#5f6368]">
                Only you have access so far.
              </p>
            ) : (
              sharedUsers.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-3 py-2.5"
                >
                  <span
                    className="gd-avatar"
                    style={{ background: colorFor(user.email) }}
                  >
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#202124]">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-[#5f6368]">
                      {user.email}
                    </p>
                  </div>
                  <span className="text-xs text-[#5f6368]">
                    {user.role === "EDITOR" ? "Editor" : "Viewer"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[#e8eaed] px-6 py-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-full bg-[#1a73e8] px-6 py-2 text-sm font-medium text-white hover:bg-[#1765cc]"
          >
            <Check size={16} />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
