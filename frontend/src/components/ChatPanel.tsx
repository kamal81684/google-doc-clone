"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronLeft,
  FileText,
  History,
  MessageSquare,
  Sparkles,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";

import {
  AiStatus,
  ChatMessage,
  ChatSource,
  ConversationSummary,
  deleteConversation,
  getConversation,
  listConversations,
  streamChat,
} from "@/services/ai.service";
import { useConfirm } from "@/components/ConfirmProvider";

interface DisplayMessage extends ChatMessage {
  sources?: ChatSource[];
  error?: boolean;
  thinking?: boolean;
}

// Reopening the panel (or reloading the page) continues the last conversation
const ACTIVE_CONVERSATION_KEY = "docs-chat:active-conversation";

const readActiveConversation = () => {
  try {
    return localStorage.getItem(ACTIVE_CONVERSATION_KEY);
  } catch {
    return null;
  }
};

const writeActiveConversation = (id: string | null) => {
  try {
    if (id) localStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
    else localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
  } catch {
    // Storage unavailable (private mode etc.): history still works, just not auto-resume
  }
};

/** "Today", "Yesterday", "Previous 7 days", or the month for older chats. */
function historyGroup(dateString: string) {
  const date = new Date(dateString);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 24 * 60 * 60 * 1000;
  if (date >= startOfToday) return "Today";
  if (date.getTime() >= startOfToday.getTime() - day) return "Yesterday";
  if (date.getTime() >= startOfToday.getTime() - 7 * day) return "Previous 7 days";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function shortTime(dateString: string) {
  const date = new Date(dateString);
  const isToday = new Date().toDateString() === date.toDateString();
  return isToday
    ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const restoredRef = useRef(false);
  const confirm = useConfirm();
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const refreshConversations = useCallback(async () => {
    try {
      setConversations(await listConversations());
    } catch {
      setConversations((prev) => prev ?? []);
    }
  }, []);

  const openConversation = useCallback(async (id: string) => {
    setView("chat");
    setLoadingConversation(true);
    try {
      const conversation = await getConversation(id);
      setMessages(
        conversation.messages.map(({ role, content, sources }) => ({ role, content, sources }))
      );
      setConversationId(conversation.id);
      writeActiveConversation(conversation.id);
    } catch {
      // Deleted elsewhere or no longer ours: start fresh
      setMessages([]);
      setConversationId(null);
      writeActiveConversation(null);
    } finally {
      setLoadingConversation(false);
    }
  }, []);

  // First open: continue the last conversation, and load the list for the empty state
  useEffect(() => {
    if (!open || restoredRef.current) return;
    restoredRef.current = true;
    // Deferred so the state updates don't run synchronously inside the effect
    queueMicrotask(() => {
      const lastId = readActiveConversation();
      if (lastId) openConversation(lastId);
      refreshConversations();
    });
  }, [open, openConversation, refreshConversations]);

  const startNewChat = () => {
    if (isStreaming) return;
    setMessages([]);
    setConversationId(null);
    writeActiveConversation(null);
    setView("chat");
    setInput("");
    inputRef.current?.focus();
  };

  const showHistory = () => {
    setView("history");
    refreshConversations();
  };

  const handleDeleteConversation = async (conversation: ConversationSummary) => {
    const confirmed = await confirm({
      title: "Delete this chat?",
      description: `"${conversation.title}" will be permanently deleted.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteConversation(conversation.id);
      setConversations((prev) => prev?.filter((c) => c.id !== conversation.id) ?? null);
      if (conversation.id === conversationId) startNewChat();
    } catch {
      // Leave the list as is; it will resync on the next refresh
    }
  };

  const updateLast = (update: (m: DisplayMessage) => DisplayMessage) => {
    setMessages((prev) => [...prev.slice(0, -1), update(prev[prev.length - 1]!)]);
  };

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || isStreaming || loadingConversation) return;
    setView("chat");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);
    setInput("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    // Models often emit text in fast bursts; queue it and reveal a few characters per frame
    // so the answer types out smoothly. Bigger backlogs reveal faster, so it never lags far behind.
    let pending = "";
    let streamDone = false;
    const revealed = new Promise<void>((resolve) => {
      const tick = () => {
        if (pending) {
          const take = Math.max(2, Math.ceil(pending.length / 12));
          const piece = pending.slice(0, take);
          pending = pending.slice(take);
          updateLast((m) => ({ ...m, content: m.content + piece }));
        }
        if (streamDone && !pending) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    let failure: string | null = null;
    try {
      // The server holds the history; it creates the conversation on the first message
      await streamChat({ message: question, conversationId }, {
        signal: controller.signal,
        onConversation: (conversation) => {
          setConversationId(conversation.id);
          writeActiveConversation(conversation.id);
        },
        onSources: (sources) => updateLast((m) => ({ ...m, sources })),
        onThinking: () => updateLast((m) => ({ ...m, thinking: true })),
        onText: (delta) => {
          pending += delta;
        },
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        failure =
          error instanceof Error ? error.message : "Something went wrong. Please try again.";
        pending = "";
      }
    } finally {
      // Let the queued text finish typing out (or stop right away if the user hit Stop)
      if (controller.signal.aborted) {
        const rest = pending;
        pending = "";
        if (rest) updateLast((m) => ({ ...m, content: m.content + rest }));
      }
      streamDone = true;
      await revealed;
      if (failure) {
        const message = failure;
        updateLast((m) => ({ ...m, error: true, content: message }));
      }
      setIsStreaming(false);
      abortRef.current = null;
      refreshConversations();
    }
  };

  // New tab, so the conversation stays open here
  const openDoc = (id: string) => {
    window.open(`/documents/${id}`, "_blank", "noopener,noreferrer");
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
          {!chatDisabled && (
            <>
              <button
                onClick={view === "history" ? () => setView("chat") : showHistory}
                className={`rounded-md p-1.5 hover:bg-gray-100 ${
                  view === "history" ? "bg-indigo-50 text-indigo-600" : "text-gray-400"
                }`}
                aria-label="Chat history"
                title="Chat history"
              >
                <History size={16} />
              </button>
              <button
                onClick={startNewChat}
                disabled={isStreaming}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-40"
                aria-label="New chat"
                title="New chat"
              >
                <SquarePen size={16} />
              </button>
            </>
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
          {view === "history" && !chatDisabled ? (
            <div>
              <button
                onClick={() => setView("chat")}
                className="-ml-1 mb-3 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium text-gray-500 hover:bg-gray-100"
              >
                <ChevronLeft size={14} />
                Back to chat
              </button>
              {conversations === null ? (
                <p className="py-6 text-center text-sm text-gray-400">Loading chats…</p>
              ) : conversations.length === 0 ? (
                <div className="mt-6 text-center">
                  <MessageSquare size={20} className="mx-auto text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No chats yet</p>
                  <p className="text-xs text-gray-400">
                    Your conversations will show up here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(
                    conversations.reduce<Record<string, ConversationSummary[]>>(
                      (groups, c) => {
                        (groups[historyGroup(c.updatedAt)] ??= []).push(c);
                        return groups;
                      },
                      {}
                    )
                  ).map(([group, items]) => (
                    <div key={group}>
                      <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                        {group}
                      </p>
                      {items.map((c) => (
                        <div
                          key={c.id}
                          className={`group flex items-center gap-2 rounded-lg px-2 py-2 ${
                            c.id === conversationId ? "bg-indigo-50" : "hover:bg-gray-50"
                          }`}
                        >
                          <button
                            onClick={() => openConversation(c.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p
                              className={`truncate text-sm ${
                                c.id === conversationId
                                  ? "font-medium text-indigo-700"
                                  : "text-gray-800"
                              }`}
                            >
                              {c.title}
                            </p>
                            <p className="text-[11px] text-gray-400">{shortTime(c.updatedAt)}</p>
                          </button>
                          <button
                            onClick={() => handleDeleteConversation(c)}
                            className="rounded-md p-1.5 text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100"
                            aria-label={`Delete chat "${c.title}"`}
                            title="Delete chat"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : loadingConversation ? (
            <p className="mt-10 animate-pulse text-center text-sm text-gray-400">
              Loading conversation…
            </p>
          ) : chatDisabled ? (
            <div className="mt-10 rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
              Chat isn&apos;t set up on this server yet. Add an{" "}
              <code className="rounded bg-gray-100 px-1 text-xs">
                LLM_API_KEY
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

              {conversations && conversations.length > 0 && (
                <div className="mt-8">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                      Recent chats
                    </p>
                    {conversations.length > 3 && (
                      <button
                        onClick={showHistory}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        View all
                      </button>
                    )}
                  </div>
                  {conversations.slice(0, 3).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => openConversation(c.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-gray-50"
                    >
                      <MessageSquare size={14} className="shrink-0 text-gray-400" />
                      <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                        {c.title}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-400">
                        {shortTime(c.updatedAt)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
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
                        {m.thinking
                          ? "Thinking…"
                          : m.sources
                            ? "Writing…"
                            : "Searching your documents…"}
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
