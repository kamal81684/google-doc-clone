"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, FileText, Sparkles, X } from "lucide-react";

import {
  AiStatus,
  ChatMessage,
  ChatSource,
  streamChat,
} from "@/services/ai.service";

interface DisplayMessage extends ChatMessage {
  sources?: ChatSource[];
  error?: boolean;
}

const SUGGESTIONS = [
  "What did I work on this week?",
  "Summarize my notes on my most recent topic",
  "Which of my docs mention deadlines or blockers?",
  "What topics do I write about most?",
];

/** Renders **bold** and [n] citations (as links to the cited document). */
function InlineText({
  text,
  sources,
  onOpenDoc,
}: {
  text: string;
  sources?: ChatSource[];
  onOpenDoc: (id: string) => void;
}) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\d+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        if (bold) return <strong key={i}>{bold[1]}</strong>;

        const citation = part.match(/^\[(\d+)\]$/);
        const source = citation
          ? sources?.find((s) => s.index === Number(citation[1]))
          : undefined;
        if (source) {
          return (
            <button
              key={i}
              onClick={() => onOpenDoc(source.documentId)}
              title={source.title}
              className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded bg-indigo-100 px-1 align-text-top text-[10px] font-semibold text-indigo-700 hover:bg-indigo-200"
            >
              {source.index}
            </button>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

/** Minimal markdown: paragraphs, "-"/"*"/"1." list items, headings, bold, citations. */
function AssistantContent({
  message,
  onOpenDoc,
}: {
  message: DisplayMessage;
  onOpenDoc: (id: string) => void;
}) {
  const lines = message.content.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return null;
        const bullet = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
        const heading = line.match(/^#{1,4}\s+(.*)$/);
        const content = bullet?.[1] ?? heading?.[1] ?? line;
        const inline = (
          <InlineText
            text={content}
            sources={message.sources}
            onOpenDoc={onOpenDoc}
          />
        );
        if (bullet) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-gray-400" />
              <p>{inline}</p>
            </div>
          );
        }
        if (heading) {
          return (
            <p key={i} className="pt-1 font-semibold">
              {inline}
            </p>
          );
        }
        return <p key={i}>{inline}</p>;
      })}
    </div>
  );
}

/** Unique documents an answer actually cited (falls back to all retrieved ones). */
function citedDocuments(message: DisplayMessage) {
  const sources = message.sources ?? [];
  const cited = new Set(
    Array.from(message.content.matchAll(/\[(\d+)\]/g)).map((m) => Number(m[1]))
  );
  const relevant = cited.size
    ? sources.filter((s) => cited.has(s.index))
    : [];
  const seen = new Set<string>();
  return relevant.filter((s) => {
    if (seen.has(s.documentId)) return false;
    seen.add(s.documentId);
    return true;
  });
}

export function ChatPanel({
  open,
  onClose,
  status,
}: {
  open: boolean;
  onClose: () => void;
  status: AiStatus | null;
}) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const updateLast = (update: (m: DisplayMessage) => DisplayMessage) => {
    setMessages((prev) => [...prev.slice(0, -1), update(prev[prev.length - 1]!)]);
  };

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || isStreaming) return;

    // Only send completed, successful turns as history
    const history: ChatMessage[] = [
      ...messages
        .filter((m) => !m.error && m.content)
        .map(({ role, content }) => ({ role, content })),
      { role: "user", content: question },
    ];

    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);
    setInput("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(history, {
        signal: controller.signal,
        onSources: (sources) => updateLast((m) => ({ ...m, sources })),
        onText: (delta) =>
          updateLast((m) => ({ ...m, content: m.content + delta })),
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        updateLast((m) => ({
          ...m,
          error: true,
          content:
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
        }));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const openDoc = (id: string) => {
    onClose();
    router.push(`/documents/${id}`);
  };

  const chatDisabled = status !== null && !status.chatEnabled;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/10 sm:hidden"
          onClick={onClose}
        />
      )}
      <aside
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-gray-200 bg-white shadow-xl transition-transform duration-200 sm:w-[420px] ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
            <Sparkles size={15} className="text-indigo-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">
              Chat with your docs
            </p>
            <p className="text-[11px] text-gray-400">
              Answers come from your documents and ones shared with you
            </p>
          </div>
          {messages.length > 0 && !isStreaming && (
            <button
              onClick={() => setMessages([])}
              className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
            >
              New chat
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"
            aria-label="Close chat"
          >
            <X size={16} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {chatDisabled ? (
            <div className="mt-10 rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
              Chat isn&apos;t set up on this server yet. Add an{" "}
              <code className="rounded bg-gray-100 px-1 text-xs">
                GROQ_API_KEY
              </code>{" "}
              to the backend to turn it on.
            </div>
          ) : messages.length === 0 ? (
            <div className="mt-6">
              <p className="mb-1 text-sm font-medium text-gray-900">
                Ask anything about your documents
              </p>
              <p className="mb-4 text-xs text-gray-500">
                Find old notes, recap your work, or pull answers out of
                everything you&apos;ve written.
              </p>
              <div className="space-y-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-indigo-600 px-3.5 py-2 text-sm text-white">
                      {m.content}
                    </p>
                  </div>
                ) : (
                  <div key={i} className="text-sm leading-6 text-gray-800">
                    {m.error ? (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-red-600">
                        {m.content}
                      </p>
                    ) : m.content ? (
                      <AssistantContent message={m} onOpenDoc={openDoc} />
                    ) : (
                      <p className="animate-pulse text-gray-400">
                        {m.sources ? "Writing…" : "Searching your documents…"}
                      </p>
                    )}

                    {!(isStreaming && i === messages.length - 1) &&
                      citedDocuments(m).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {citedDocuments(m).map((s) => (
                            <button
                              key={s.documentId}
                              onClick={() => openDoc(s.documentId)}
                              className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
                            >
                              <FileText size={12} className="shrink-0" />
                              <span className="truncate">{s.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-3">
          <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-indigo-300 focus-within:bg-white">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              disabled={chatDisabled}
              placeholder="Ask about your documents…"
              className="max-h-32 flex-1 resize-none bg-transparent py-1 text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
            {isStreaming ? (
              <button
                onClick={() => abortRef.current?.abort()}
                className="rounded-lg bg-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || chatDisabled}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-40"
                aria-label="Send"
              >
                <ArrowUp size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
