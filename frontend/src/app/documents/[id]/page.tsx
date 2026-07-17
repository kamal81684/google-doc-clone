"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";

import {getDocumentById,updateDocument,} from "@/services/document.services";

import DocumentEditor from "@/components/editor/DocumentEditor";

export default function DocumentPage() {

    const params = useParams();
    const id = params.id as string;

    const [document, setDocument] = useState<any>(null);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState<any>(null);
    const latestTitle = useRef(title);
    const latestContent = useRef(content);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        latestTitle.current = title;
    }, [title]);

    useEffect(() => {
        latestContent.current = content;
    }, [content]);

    useEffect(() => {

        const fetchDocument = async () => {

            const response = await getDocumentById(id);

            setDocument(response.document);
            setTitle(response.document.title);
            setContent(response.document.content);

            latestTitle.current = response.document.title;
            latestContent.current = response.document.content;

        };

        fetchDocument();

    }, [id]);

    const saveDocument = useCallback(async (fields: { title?: string; content?: any }) => {
        try {
            await updateDocument(id, fields);
            toast.success("Document saved");
        } catch {
            toast.error("Failed to save document");
        }
    }, [id]);

    useEffect(() => {
        if (!document) return;

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            saveDocument({ title: latestTitle.current, content: latestContent.current });
        }, 1000);

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [title, content, document, saveDocument]);

    if (!document) {
        return <p>Loading...</p>;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f1f3f4" }}>

            <div style={{ padding: "12px 24px", background: "#fff", borderBottom: "1px solid #e0e0e0" }}>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{ fontSize: "24px", fontWeight: "bold", border: "none", outline: "none", width: "100%" }}
                />
            </div>

            <div style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", padding: "24px 0" }}>
                <div style={{ width: "100%", maxWidth: "816px", minHeight: "1056px", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.12)", padding: "96px 72px" }}>
                    <DocumentEditor
                        initialContent={content}
                        onChange={setContent}
                    />
                </div>
            </div>

        </div>
    );
}
