"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Folder, LoaderCircle, Sparkles, X } from "lucide-react";

import {
  applyOrganize,
  OrganizeProposal,
  proposeOrganize,
  ProposedDocument,
} from "@/services/ai.service";

interface EditableFolder {
  name: string;
  description: string;
  isExisting: boolean;
  documents: (ProposedDocument & { included: boolean })[];
}

export function OrganizeDialog({
  onClose,
  onApplied,
}: {
  onClose: () => void;
  onApplied: () => void;
}) {
  const [folders, setFolders] = useState<EditableFolder[] | null>(null);
  const [proposal, setProposal] = useState<OrganizeProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    proposeOrganize()
      .then(({ proposal }) => {
        if (cancelled) return;
        setProposal(proposal);
        setFolders(
          proposal.folders.map((f) => ({
            name: f.name,
            description: f.description,
            isExisting: f.existingFolderId !== null,
            documents: f.documents.map((d) => ({ ...d, included: true })),
          }))
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err?.response?.data?.message ||
            "Couldn't generate a folder plan. Please try again."
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateFolder = (index: number, update: Partial<EditableFolder>) => {
    setFolders((prev) =>
      prev!.map((f, i) => (i === index ? { ...f, ...update } : f))
    );
  };

  const toggleDocument = (folderIndex: number, docId: string) => {
    setFolders((prev) =>
      prev!.map((f, i) =>
        i === folderIndex
          ? {
              ...f,
              documents: f.documents.map((d) =>
                d.id === docId ? { ...d, included: !d.included } : d
              ),
            }
          : f
      )
    );
  };

  const plan = (folders ?? [])
    .map((f) => ({
      name: f.name.trim(),
      description: f.description,
      documentIds: f.documents.filter((d) => d.included).map((d) => d.id),
    }))
    .filter((f) => f.name && f.documentIds.length > 0);
  const movingCount = plan.reduce((n, f) => n + f.documentIds.length, 0);

  const handleApply = async () => {
    if (isApplying || plan.length === 0) return;
    setIsApplying(true);
    try {
      const result = await applyOrganize(plan);
      toast.success(`Organized ${result.moved} documents into ${plan.length} folders`);
      onApplied();
      onClose();
    } catch {
      toast.error("Failed to apply folders");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
            <Sparkles size={16} className="text-indigo-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900">
              Organize with AI
            </h2>
            <p className="text-xs text-gray-500">
              Suggested folders for your unfiled documents. Review, rename or
              uncheck anything before applying.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          ) : !folders || !proposal ? (
            <div className="flex flex-col items-center justify-center py-16 text-sm text-gray-500">
              <LoaderCircle size={22} className="mb-3 animate-spin text-indigo-500" />
              Reading your documents and grouping them…
            </div>
          ) : folders.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">
              {proposal.unassigned.length === 0
                ? "Everything is already in a folder. Nothing to organize."
                : "Couldn't find a useful grouping for your unfiled documents yet."}
            </p>
          ) : (
            <div className="space-y-4">
              {folders.map((folder, fi) => (
                <div key={fi} className="rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3 border-b border-gray-100 px-4 py-3">
                    <Folder size={18} className="mt-1.5 shrink-0 text-indigo-500" />
                    <div className="min-w-0 flex-1">
                      <input
                        value={folder.name}
                        onChange={(e) => updateFolder(fi, { name: e.target.value })}
                        maxLength={60}
                        className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm font-medium text-gray-900 outline-none hover:border-gray-200 focus:border-indigo-300"
                        aria-label="Folder name"
                      />
                      <p className="px-1.5 text-xs text-gray-500">
                        {folder.isExisting ? "Existing folder · " : "New folder · "}
                        {folder.description}
                      </p>
                    </div>
                  </div>
                  <ul className="divide-y divide-gray-50 px-2 py-1">
                    {folder.documents.map((doc) => (
                      <li key={doc.id}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={doc.included}
                            onChange={() => toggleDocument(fi, doc.id)}
                            className="h-4 w-4 accent-indigo-600"
                          />
                          <span
                            className={`flex-1 truncate text-sm ${
                              doc.included ? "text-gray-800" : "text-gray-400 line-through"
                            }`}
                          >
                            {doc.title}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {proposal.unassigned.length > 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400">
                    Staying unfiled ({proposal.unassigned.length})
                  </p>
                  <p className="text-sm text-gray-500">
                    {proposal.unassigned.map((d) => d.title).join(", ")}
                  </p>
                </div>
              )}

              {proposal.remaining > 0 && (
                <p className="text-xs text-gray-500">
                  {proposal.remaining} older unfiled documents weren&apos;t
                  included this time. Run Organize again after applying to sort
                  them too.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button onClick={onClose} className="gd-btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying || movingCount === 0}
            className="gd-btn-primary"
          >
            {isApplying
              ? "Applying…"
              : movingCount
                ? `Move ${movingCount} documents`
                : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
