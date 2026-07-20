"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { shareDocument, getDocumentPermissions, SharedUser } from "@/services/document.services";

interface ShareDialogProps {
    documentId: string;
    open: boolean;
    onClose: () => void;
}

export default function ShareDialog({ documentId, open, onClose }: ShareDialogProps) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"VIEWER" | "EDITOR">("VIEWER");
    const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchPermissions = useCallback(async () => {
        try {
            const res = await getDocumentPermissions(documentId);
            setSharedUsers(res.permissions);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to load permissions");
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
            toast.success(`Document shared with ${email.trim()}`);
            setEmail("");
            setRole("VIEWER");
            fetchPermissions();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to share document");
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.4)",
                }}
            />

            {/* Dialog */}
            <div
                style={{
                    position: "relative",
                    background: "#fff",
                    borderRadius: "8px",
                    padding: "24px",
                    width: "100%",
                    maxWidth: "480px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                }}
            >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Share Document</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            fontSize: "20px",
                            cursor: "pointer",
                            color: "#666",
                            padding: "0 4px",
                        }}
                    >
                        x
                    </button>
                </div>

                {/* Share form */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                    <input
                        type="email"
                        placeholder="Enter email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleShare();
                        }}
                        style={{
                            flex: 1,
                            padding: "8px 12px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            outline: "none",
                            fontSize: "14px",
                        }}
                    />
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as "VIEWER" | "EDITOR")}
                        style={{
                            padding: "8px 12px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            outline: "none",
                            fontSize: "14px",
                            cursor: "pointer",
                        }}
                    >
                        <option value="VIEWER">Viewer</option>
                        <option value="EDITOR">Editor</option>
                    </select>
                    <button
                        onClick={handleShare}
                        disabled={loading}
                        style={{
                            padding: "8px 16px",
                            background: "#2563eb",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: loading ? "not-allowed" : "pointer",
                            fontSize: "14px",
                            opacity: loading ? 0.6 : 1,
                        }}
                    >
                        {loading ? "Sharing..." : "Share"}
                    </button>
                </div>

                {/* Shared users list */}
                <div>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 8px 0", color: "#555" }}>
                        People with access
                    </h3>
                    {sharedUsers.length === 0 ? (
                        <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>
                            No one else has access yet.
                        </p>
                    ) : (
                        <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                            {sharedUsers.map((user) => (
                                <div
                                    key={user.userId}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "8px 0",
                                        borderBottom: "1px solid #f0f0f0",
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: "14px", fontWeight: 500 }}>{user.name}</div>
                                        <div style={{ fontSize: "12px", color: "#888" }}>{user.email}</div>
                                    </div>
                                    <span
                                        style={{
                                            fontSize: "12px",
                                            padding: "2px 8px",
                                            borderRadius: "4px",
                                            background: user.role === "EDITOR" ? "#dbeafe" : "#f3f4f6",
                                            color: user.role === "EDITOR" ? "#1d4ed8" : "#6b7280",
                                        }}
                                    >
                                        {user.role}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
