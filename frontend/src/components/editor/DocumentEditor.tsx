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
import {
  Undo2,
  Redo2,
  Printer,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Link2,
  Code,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ChevronDown,
  Check,
} from "lucide-react";

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
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`gd-icon-btn${active ? " is-active" : ""}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-[#dadce0]" />;
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
  const [styleOpen, setStyleOpen] = useState(false);

  const userColor = useMemo(() => {
    let hash = 0;
    for (const char of userName) {
      hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }
    return COLORS[hash % COLORS.length];
  }, [userName]);

  const editor = useEditor({
    immediatelyRender: true,
    // TipTap v3 no longer re-renders the component on transactions by default,
    // so toolbar active states (bold/italic/etc.) would appear frozen. Opt in.
    shouldRerenderOnTransaction: true,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        link: false,
        undoRedo: false,
      }),
      Placeholder.configure({
        placeholder: "Start typing…",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          style: "color: #1155cc; text-decoration: underline; cursor: pointer;",
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
        <div className="flex justify-center bg-white px-4 pb-2">
          <div className="flex flex-wrap items-center gap-0.5 rounded-full bg-[#edf2fa] px-3 py-1.5">
            <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()}>
              <Undo2 size={18} />
            </ToolBtn>
            <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()}>
              <Redo2 size={18} />
            </ToolBtn>
            <ToolBtn title="Print" onClick={() => window.print()}>
              <Printer size={18} />
            </ToolBtn>

            <Divider />

            {/* Text style dropdown */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setStyleOpen((v) => !v)}
                className="flex h-7 items-center gap-1 rounded px-2 text-sm text-[#202124] hover:bg-[#e2e7ed]"
              >
                <span className="min-w-[84px] text-left">{currentStyle}</span>
                <ChevronDown size={16} />
              </button>
              {styleOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setStyleOpen(false)}
                  />
                  <div className="absolute left-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-[#dadce0] bg-white py-1 shadow-[0_4px_20px_rgba(60,64,67,0.2)]">
                    {TEXT_STYLES.map((s) => {
                      const active = s.isActive(editor);
                      return (
                        <button
                          key={s.label}
                          onClick={() => {
                            s.run(editor);
                            setStyleOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#f1f3f4]"
                        >
                          <span className="w-4 text-[#1a73e8]">
                            {active && <Check size={16} />}
                          </span>
                          <span
                            className={
                              s.label === "Heading 1"
                                ? "text-xl"
                                : s.label === "Heading 2"
                                ? "text-lg"
                                : s.label === "Heading 3"
                                ? "text-base"
                                : "text-sm"
                            }
                          >
                            {s.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <Divider />

            <ToolBtn
              title="Bold"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold size={18} />
            </ToolBtn>
            <ToolBtn
              title="Italic"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic size={18} />
            </ToolBtn>
            <ToolBtn
              title="Underline"
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon size={18} />
            </ToolBtn>
            <ToolBtn
              title="Strikethrough"
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough size={18} />
            </ToolBtn>

            <Divider />

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
              <Link2 size={18} />
            </ToolBtn>
            <ToolBtn
              title="Code block"
              active={editor.isActive("codeBlock")}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            >
              <Code size={18} />
            </ToolBtn>

            <Divider />

            <ToolBtn
              title="Bulleted list"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List size={18} />
            </ToolBtn>
            <ToolBtn
              title="Numbered list"
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered size={18} />
            </ToolBtn>

            <Divider />

            <ToolBtn
              title="Align left"
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            >
              <AlignLeft size={18} />
            </ToolBtn>
            <ToolBtn
              title="Align center"
              active={editor.isActive({ textAlign: "center" })}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            >
              <AlignCenter size={18} />
            </ToolBtn>
            <ToolBtn
              title="Align right"
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            >
              <AlignRight size={18} />
            </ToolBtn>
            <ToolBtn
              title="Justify"
              active={editor.isActive({ textAlign: "justify" })}
              onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            >
              <AlignJustify size={18} />
            </ToolBtn>
          </div>
        </div>
      )}

      {/* Link input bar */}
      {!readOnly && showLinkInput && (
        <div className="flex justify-center bg-white px-4 pb-2">
          <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-[#dadce0] bg-white px-3 py-2 shadow-sm">
            <input
              type="url"
              placeholder="Paste a link (https://…)"
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
              className="flex-1 text-sm outline-none"
            />
            <button
              onClick={setLink}
              className="rounded-full bg-[#1a73e8] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#1765cc]"
            >
              Apply
            </button>
            <button
              onClick={() => {
                setShowLinkInput(false);
                setLinkUrl("");
              }}
              className="rounded-full px-3 py-1.5 text-sm text-[#5f6368] hover:bg-[#f1f3f4]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Canvas + page */}
      <div className="flex-1 overflow-auto border-t border-[#e0e0e0] bg-[#f9fbfd] py-9">
        <div
          className="mx-auto bg-white shadow-[0_1px_3px_rgba(60,64,67,0.15),0_1px_2px_rgba(60,64,67,0.3)]"
          style={{
            width: "100%",
            maxWidth: "816px",
            minHeight: "1056px",
            padding: "96px 72px",
          }}
        >
          <EditorContent editor={editor} className="gd-page" />
        </div>
      </div>
    </div>
  );
}
