"use client";

import { useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";

interface DocumentEditorProps {
    initialContent: any;
    onChange: (content: any) => void;
    readOnly?: boolean;
}

export default function DocumentEditor({
    initialContent,
    onChange,
    readOnly = false,
}: DocumentEditorProps) {

    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");

    const editor = useEditor({
        immediatelyRender: true,
        editable: !readOnly,
        extensions: [
            StarterKit.configure({
                link: false,
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
        ],

        content: initialContent || {
            type: "doc",
            content: [
                {
                    type: "paragraph",
                },
            ],
        },

        onUpdate: ({ editor }) => {
            onChange(editor.getJSON());
        },
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
