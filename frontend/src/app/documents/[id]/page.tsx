"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";

import {getDocumentById,updateDocument,downloadDocument,} from "@/services/document.services";
import type { Document as DocumentData } from "@/services/document.services";

import { useCollaboration } from "@/hooks/useCollaboration";
import DocumentEditor from "@/components/editor/DocumentEditor";
import ShareDialog from "@/components/ShareDialog";

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

export default function DocumentPage() {

    const params = useParams();
    const id = params.id as string;

    const [document, setDocument] = useState<DocumentData | null>(null);
    const [title, setTitle] = useState("");
    const [accessRole, setAccessRole] = useState<"OWNER" | "EDITOR" | "VIEWER" | null>(null);
    const [shareOpen, setShareOpen] = useState(false);
    const [userName, setUserName] = useState("Anonymous");

    const previousTitle = useRef(title);

    useEffect(() => {
        const fetchDocument = async () => {
            const response = await getDocumentById(id);
            setDocument(response.document);
            setTitle(response.document.title);
            setAccessRole(response.document.accessRole);
            previousTitle.current = response.document.title;
        };
        fetchDocument();
    }, [id]);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"}/auth/me`,
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

    // Title-only save (debounced)
    const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleTitleChange = useCallback((newTitle: string) => {
        setTitle(newTitle);

        if (titleTimer.current) {
            clearTimeout(titleTimer.current);
        }

        titleTimer.current = setTimeout(async () => {
            try {
                await updateDocument(id, { title: newTitle });
                previousTitle.current = newTitle;
            } catch (error: unknown) {
                toast.error(getErrorMessage(error, "Failed to save title"));
                setTitle(previousTitle.current);
            }
        }, 1000);
    }, [id]);

    useEffect(() => {
        return () => {
            if (titleTimer.current) {
                clearTimeout(titleTimer.current);
            }
        };
    }, []);

    const handleDownload = useCallback(async (format: "txt" | "pdf") => {
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
    }, [id, title]);

    if (!document || !isSynced || !provider || !doc) {
        return <p>Loading document...</p>;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f1f3f4" }}>

            <div style={{ padding: "12px 24px", background: "#fff", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", gap: "12px" }}>
                <input
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    readOnly={accessRole !== "OWNER" && accessRole !== "EDITOR"}
                    style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        border: "none",
                        outline: "none",
                        flex: 1,
                        background: accessRole === "VIEWER" ? "transparent" : undefined,
                        cursor: accessRole === "VIEWER" ? "default" : undefined,
                    }}
                />
                {accessRole === "OWNER" && (
                    <button
                        onClick={() => setShareOpen(true)}
                        style={{ padding: "6px 12px", border: "1px solid #ccc", borderRadius: "4px", background: "#fff", cursor: "pointer", fontSize: "14px" }}
                    >
                        Share
                    </button>
                )}
                <button
                    onClick={() => handleDownload("txt")}
                    style={{ padding: "6px 12px", border: "1px solid #ccc", borderRadius: "4px", background: "#fff", cursor: "pointer", fontSize: "14px" }}
                >
                    Download TXT
                </button>
                <button
                    onClick={() => handleDownload("pdf")}
                    style={{ padding: "6px 12px", border: "1px solid #ccc", borderRadius: "4px", background: "#fff", cursor: "pointer", fontSize: "14px" }}
                >
                    Download PDF
                </button>
            </div>

            <div style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", padding: "24px 0" }}>
                <div style={{ width: "100%", maxWidth: "816px", minHeight: "1056px", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.12)", padding: "96px 72px" }}>
                    <DocumentEditor
                        provider={provider}
                        doc={doc}
                        userName={userName}
                        readOnly={accessRole === "VIEWER"}
                    />
                </div>
            </div>

            <ShareDialog
                documentId={id}
                open={shareOpen}
                onClose={() => setShareOpen(false)}
            />

        </div>
    );
}
