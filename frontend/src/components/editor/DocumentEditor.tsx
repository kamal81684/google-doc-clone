"use client";

import { useCallback, useMemo, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { WebsocketProvider } from "y-websocket";
import type { Doc as YDoc } from "yjs";

const COLORS = [
  "#30bced", "#6eeb83", "#ffbc42", "#ecd444",
  "#ee6352", "#9ac2c9", "#8acb88", "#1be7ff",
];

interface DocumentEditorProps {
    provider: WebsocketProvider;
    doc: YDoc;
    userName: string;
    readOnly?: boolean;
}

export default function DocumentEditor(props: DocumentEditorProps) {
    const { provider, doc, userName, readOnly = false } = props;

    if (!provider || !doc) return null;

    const collaborationDoc = doc as YDoc;
    return (
        <EditorInner
            provider={provider}
            doc={collaborationDoc}
            userName={userName}
            readOnly={readOnly}
        />
    );
}

function EditorInner({
    provider,
    doc,
    userName,
    readOnly = false,
}: {
    provider: WebsocketProvider;
    doc: YDoc;
    userName: string;
    readOnly?: boolean;
}) {
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const userColor = useMemo(() => {
        let hash = 0;
        for (const char of userName) {
            hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
        }

        return COLORS[hash % COLORS.length];
    }, [userName]);

    const editor = useEditor({
        immediatelyRender: true,
        editable: !readOnly,
        extensions: [
            StarterKit.configure({
                link: false,
                undoRedo: false,
            }),
            Placeholder.configure({
                placeholder: "Start typing...",
            }),
            TextAlign.configure({
                types: ["heading", "paragraph"],
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    style: "color: #2563eb; text-decoration: underline; cursor: pointer;",
                },
            }),
            Collaboration.configure({
                document: doc,
                field: "tiptap",
            }),
            CollaborationCaret.configure({
                provider: provider,
                user: {
                    name: userName,
                    color: userColor,
                },
                render: (user) => {
                    const cursor = document.createElement("span");
                    cursor.classList.add("collaboration-cursor__caret");
                    cursor.setAttribute("style", `border-color: ${user.color}`);

                    const label = document.createElement("div");
                    label.classList.add("collaboration-cursor__label");
                    label.setAttribute("style", `background-color: ${user.color}`);
                    label.insertBefore(document.createTextNode(user.name), null);

                    cursor.insertBefore(label, null);
                    return cursor;
                },
                selectionRender: (user) => {
                    return {
                        nodeName: "span",
                        class: "collaboration-cursor__selection",
                        style: `background-color: ${user.color}22`,
                    };
                },
            }),
        ],
    });

    const setLink = useCallback(() => {
        if (!editor) return;

        if (linkUrl === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
        } else {
            editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
        }

        setLinkUrl("");
        setShowLinkInput(false);
    }, [editor, linkUrl]);

    if (!editor) return null;

    const btnStyle = (active: boolean) => ({
        background: active ? "#e0e0e0" : "transparent",
        border: "1px solid #ccc",
        borderRadius: "4px",
        padding: "4px 8px",
        cursor: "pointer" as const,
    });

    return (
        <div>
            {/* Toolbar */}
            {!readOnly && (
            <div style={{ display: "flex", gap: "4px", padding: "8px", borderBottom: "1px solid #e0e0e0", flexWrap: "wrap", alignItems: "center" }}>

                {/* Text formatting */}
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    style={{ ...btnStyle(editor.isActive("bold")), fontWeight: "bold" }}
                >
                    B
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    style={{ ...btnStyle(editor.isActive("italic")), fontStyle: "italic" }}
                >
                    I
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    style={{ ...btnStyle(editor.isActive("strike")), textDecoration: "line-through" }}
                >
                    S
                </button>

                <div style={{ width: "1px", background: "#ccc", margin: "0 4px" }} />

                {/* Headings */}
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    style={{ ...btnStyle(editor.isActive("heading", { level: 1 })), fontWeight: "bold" }}
                >
                    H1
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    style={{ ...btnStyle(editor.isActive("heading", { level: 2 })), fontWeight: "bold" }}
                >
                    H2
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    style={{ ...btnStyle(editor.isActive("heading", { level: 3 })), fontWeight: "bold" }}
                >
                    H3
                </button>

                <div style={{ width: "1px", background: "#ccc", margin: "0 4px" }} />

                {/* Lists */}
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    style={btnStyle(editor.isActive("bulletList"))}
                >
                    • List
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    style={btnStyle(editor.isActive("orderedList"))}
                >
                    1. List
                </button>

                <div style={{ width: "1px", background: "#ccc", margin: "0 4px" }} />

                {/* Text align */}
                <button
                    onClick={() => editor.chain().focus().setTextAlign("left").run()}
                    style={btnStyle(editor.isActive({ textAlign: "left" }))}
                >
                    ≡←
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign("center").run()}
                    style={btnStyle(editor.isActive({ textAlign: "center" }))}
                >
                    ≡
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign("right").run()}
                    style={btnStyle(editor.isActive({ textAlign: "right" }))}
                >
                    →≡
                </button>

                <div style={{ width: "1px", background: "#ccc", margin: "0 4px" }} />

                {/* Link */}
                <button
                    onClick={() => {
                        if (editor.isActive("link")) {
                            editor.chain().focus().unsetLink().run();
                        } else {
                            setShowLinkInput(!showLinkInput);
                        }
                    }}
                    style={btnStyle(editor.isActive("link"))}
                >
                    🔗
                </button>

                <div style={{ width: "1px", background: "#ccc", margin: "0 4px" }} />

                {/* Code & Paragraph */}
                <button
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    style={btnStyle(editor.isActive("codeBlock"))}
                >
                    &lt;/&gt;
                </button>
                <button
                    onClick={() => editor.chain().focus().setParagraph().run()}
                    style={btnStyle(editor.isActive("paragraph"))}
                >
                    ¶
                </button>
            </div>
            )}

            {/* Link input bar */}
            {!readOnly && showLinkInput && (
                <div style={{ display: "flex", gap: "8px", padding: "8px", borderBottom: "1px solid #e0e0e0", alignItems: "center" }}>
                    <input
                        type="url"
                        placeholder="Enter URL (https://...)"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") setLink();
                            if (e.key === "Escape") { setShowLinkInput(false); setLinkUrl(""); }
                        }}
                        autoFocus
                        style={{ flex: 1, padding: "4px 8px", border: "1px solid #ccc", borderRadius: "4px", outline: "none" }}
                    />
                    <button
                        onClick={setLink}
                        style={{ padding: "4px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                        Apply
                    </button>
                    <button
                        onClick={() => { setShowLinkInput(false); setLinkUrl(""); }}
                        style={{ padding: "4px 12px", background: "#e0e0e0", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Editor */}
            <div style={{ minHeight: "864px" }}>
                <EditorContent
                    editor={editor}
                    style={{ minHeight: "864px" }}
                />
            </div>
        </div>
    );
}
