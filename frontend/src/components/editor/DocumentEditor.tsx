"use client";

import { useCallback, useMemo, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { WebsocketProvider } from "y-websocket";
import type { Doc as YDoc } from "yjs";
import { ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COLORS = [
  "#30bced", "#6eeb83", "#ffbc42", "#ecd444",
  "#ee6352", "#9ac2c9", "#8acb88", "#1be7ff",
];

const TEXT_STYLES = [
  { label: "Normal text", isActive: (e: Editor) => e.isActive("paragraph"), run: (e: Editor) => e.chain().focus().setParagraph().run() },
  { label: "Heading 1", isActive: (e: Editor) => e.isActive("heading", { level: 1 }), run: (e: Editor) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: "Heading 2", isActive: (e: Editor) => e.isActive("heading", { level: 2 }), run: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Heading 3", isActive: (e: Editor) => e.isActive("heading", { level: 3 }), run: (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run() },
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

  return (
    <EditorInner
      provider={provider}
      doc={doc as YDoc}
      userName={userName}
      readOnly={readOnly}
    />
  );
}

function ToolBtn({
  onClick,
  active,
  disabled,
  title,
  children,
  className,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`gd-icon-btn${active ? " is-active" : ""}${className ? ` ${className}` : ""}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-gray-200" />;
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
    shouldRerenderOnTransaction: true,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        link: false,
        undoRedo: false,
      }),
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          style: "color: #4f46e5; text-decoration: underline; cursor: pointer;",
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
        selectionRender: (user) => ({
          nodeName: "span",
          class: "collaboration-cursor__selection",
          style: `background-color: ${user.color}22`,
        }),
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

  const currentStyle =
    TEXT_STYLES.find((s) => s.isActive(editor))?.label ?? "Normal text";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex justify-center border-b border-gray-200 bg-white px-4 py-1.5">
          <div className="flex flex-wrap items-center gap-0.5">
            {/* Undo / Redo - text labels */}
            <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()}>
              <span className="text-xs font-medium">Undo</span>
            </ToolBtn>
            <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()}>
              <span className="text-xs font-medium">Redo</span>
            </ToolBtn>

            <Divider />

            {/* Text style dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                onMouseDown={(e) => e.preventDefault()}
                className="flex h-8 items-center gap-1 rounded-md px-2 text-sm text-gray-600 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-indigo-200 data-popup-open:bg-gray-100"
                aria-label="Text style"
              >
                <span className="min-w-[80px] text-left text-xs">{currentStyle}</span>
                <ChevronDown size={14} />
              </DropdownMenuTrigger>
              {/* Commands refocus the editor; don't let the menu pull focus back to its trigger */}
              <DropdownMenuContent className="w-48" finalFocus={false}>
                {TEXT_STYLES.map((s) => (
                  <DropdownMenuItem key={s.label} onClick={() => s.run(editor)} className="py-1.5">
                    <span className="w-4 text-indigo-500">
                      {s.isActive(editor) && <Check size={14} />}
                    </span>
                    <span
                      className={
                        s.label === "Heading 1"
                          ? "text-lg font-bold"
                          : s.label === "Heading 2"
                          ? "text-base font-semibold"
                          : s.label === "Heading 3"
                          ? "text-sm font-semibold"
                          : "text-sm"
                      }
                    >
                      {s.label}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Divider />

            {/* Bold / Italic / Underline / Strike - text labels */}
            <ToolBtn
              title="Bold"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <span className="text-sm font-bold">B</span>
            </ToolBtn>
            <ToolBtn
              title="Italic"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <span className="text-sm italic">I</span>
            </ToolBtn>
            <ToolBtn
              title="Underline"
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <span className="text-sm underline">U</span>
            </ToolBtn>
            <ToolBtn
              title="Strikethrough"
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <span className="text-sm line-through">S</span>
            </ToolBtn>

            <Divider />

            {/* Link / Code - text labels */}
            <ToolBtn
              title="Insert link"
              active={editor.isActive("link")}
              onClick={() => {
                if (editor.isActive("link")) {
                  editor.chain().focus().unsetLink().run();
                } else {
                  setShowLinkInput((v) => !v);
                }
              }}
            >
              <span className="text-xs font-medium underline">Link</span>
            </ToolBtn>
            <ToolBtn
              title="Code block"
              active={editor.isActive("codeBlock")}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            >
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-medium">{"</>"}</span>
            </ToolBtn>

            <Divider />

            {/* Lists - text labels */}
            <ToolBtn
              title="Bulleted list"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <span className="text-xs font-medium">Bullets</span>
            </ToolBtn>
            <ToolBtn
              title="Numbered list"
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <span className="text-xs font-medium">Numbers</span>
            </ToolBtn>

            <Divider />

            {/* Alignment - text labels */}
            <ToolBtn
              title="Align left"
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            >
              <span className="text-xs font-medium">Left</span>
            </ToolBtn>
            <ToolBtn
              title="Align center"
              active={editor.isActive({ textAlign: "center" })}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            >
              <span className="text-xs font-medium">Center</span>
            </ToolBtn>
            <ToolBtn
              title="Align right"
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            >
              <span className="text-xs font-medium">Right</span>
            </ToolBtn>
          </div>
        </div>
      )}

      {/* Link input bar */}
      {!readOnly && showLinkInput && (
        <div className="flex justify-center border-b border-gray-200 bg-white px-4 py-2">
          <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <input
              type="url"
              placeholder="Paste a link (https://...)"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setLink();
                if (e.key === "Escape") {
                  setShowLinkInput(false);
                  setLinkUrl("");
                }
              }}
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none"
            />
            <button
              onClick={setLink}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Apply
            </button>
            <button
              onClick={() => {
                setShowLinkInput(false);
                setLinkUrl("");
              }}
              className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Canvas + page */}
      <div className="flex-1 overflow-auto bg-[#f3f4f6] py-8">
        <div
          className="mx-auto bg-white shadow-sm"
          style={{
            width: "100%",
            maxWidth: "800px",
            minHeight: "1056px",
            padding: "80px 72px",
          }}
        >
          <EditorContent editor={editor} className="gd-page" />
        </div>
      </div>
    </div>
  );
}
