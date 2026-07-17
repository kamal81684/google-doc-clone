"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface DocumentEditorProps {
    initialContent: any;
    onChange: (content: any) => void;
}

export default function DocumentEditor({
    initialContent,
    onChange,
}: DocumentEditorProps) {

    const editor = useEditor({
        extensions: [
            StarterKit,
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

    if (!editor) return null;

    return (
        <div>
            {/* Toolbar */}
            <div style={{ display: "flex", gap: "4px", padding: "8px", borderBottom: "1px solid #e0e0e0", flexWrap: "wrap" }}>
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    style={{ fontWeight: editor.isActive("bold") ? "bold" : "normal", background: editor.isActive("bold") ? "#e0e0e0" : "transparent", border: "1px solid #ccc", borderRadius: "4px", padding: "4px 8px", cursor: "pointer" }}
                >
                    B
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    style={{ fontStyle: editor.isActive("italic") ? "italic" : "normal", background: editor.isActive("italic") ? "#e0e0e0" : "transparent", border: "1px solid #ccc", borderRadius: "4px", padding: "4px 8px", cursor: "pointer" }}
                >
                    I
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    style={{ textDecoration: editor.isActive("strike") ? "line-through" : "none", background: editor.isActive("strike") ? "#e0e0e0" : "transparent", border: "1px solid #ccc", borderRadius: "4px", padding: "4px 8px", cursor: "pointer" }}
                >
                    S
                </button>
                <div style={{ width: "1px", background: "#ccc", margin: "0 4px" }} />
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    style={{ fontWeight: editor.isActive("heading", { level: 1 }) ? "bold" : "normal", background: editor.isActive("heading", { level: 1 }) ? "#e0e0e0" : "transparent", border: "1px solid #ccc", borderRadius: "4px", padding: "4px 8px", cursor: "pointer" }}
                >
                    H1
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    style={{ fontWeight: editor.isActive("heading", { level: 2 }) ? "bold" : "normal", background: editor.isActive("heading", { level: 2 }) ? "#e0e0e0" : "transparent", border: "1px solid #ccc", borderRadius: "4px", padding: "4px 8px", cursor: "pointer" }}
                >
                    H2
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    style={{ fontWeight: editor.isActive("heading", { level: 3 }) ? "bold" : "normal", background: editor.isActive("heading", { level: 3 }) ? "#e0e0e0" : "transparent", border: "1px solid #ccc", borderRadius: "4px", padding: "4px 8px", cursor: "pointer" }}
                >
                    H3
                </button>
                <div style={{ width: "1px", background: "#ccc", margin: "0 4px" }} />
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    style={{ background: editor.isActive("bulletList") ? "#e0e0e0" : "transparent", border: "1px solid #ccc", borderRadius: "4px", padding: "4px 8px", cursor: "pointer" }}
                >
                    • List
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    style={{ background: editor.isActive("orderedList") ? "#e0e0e0" : "transparent", border: "1px solid #ccc", borderRadius: "4px", padding: "4px 8px", cursor: "pointer" }}
                >
                    1. List
                </button>
                <div style={{ width: "1px", background: "#ccc", margin: "0 4px" }} />
                <button
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    style={{ background: editor.isActive("codeBlock") ? "#e0e0e0" : "transparent", border: "1px solid #ccc", borderRadius: "4px", padding: "4px 8px", cursor: "pointer" }}
                >
                    &lt;/&gt;
                </button>
                <button
                    onClick={() => editor.chain().focus().setParagraph().run()}
                    style={{ background: editor.isActive("paragraph") ? "#e0e0e0" : "transparent", border: "1px solid #ccc", borderRadius: "4px", padding: "4px 8px", cursor: "pointer" }}
                >
                    ¶
                </button>
            </div>

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
