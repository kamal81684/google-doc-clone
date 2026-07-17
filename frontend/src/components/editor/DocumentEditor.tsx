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

    return (
        <div>
            <EditorContent editor={editor} />
        </div>
    );
}