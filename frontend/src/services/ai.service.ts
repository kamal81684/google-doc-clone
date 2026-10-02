import api from "./axios";

export interface AiStatus {
  chatEnabled: boolean;
  semanticSearch: boolean;
  smartFiling: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatSource {
  index: number;
  documentId: string;
  title: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: ChatSource[];
    createdAt: string;
  }[];
}

export const listConversations = async (): Promise<ConversationSummary[]> => {
    const response = await api.get("/ai/conversations");
    return response.data.conversations;
};

export const getConversation = async (id: string): Promise<ConversationDetail> => {
    const response = await api.get(`/ai/conversations/${id}`);
    return response.data.conversation;
};

export const deleteConversation = async (id: string) => {
    const response = await api.delete(`/ai/conversations/${id}`);
    return response.data;
};

export interface ProposedDocument {
  id: string;
  title: string;
  confidence: number | null;
}

export interface OrganizeProposal {
  folders: {
    name: string;
    description: string;
    existingFolderId: string | null;
    documents: ProposedDocument[];
  }[];
  unassigned: ProposedDocument[];
  remaining: number;
  assignedBy: "typesafe" | "llm";
}

export const getAiStatus = async (): Promise<AiStatus & { success: boolean }> => {
    const response = await api.get("/ai/status");
    return response.data;
};

export const proposeOrganize = async (): Promise<{ success: boolean; proposal: OrganizeProposal }> => {
    const response = await api.post("/ai/organize");
    return response.data;
};

export const applyOrganize = async (folders: {
    name: string;
    description?: string;
    documentIds: string[];
}[]) => {
    const response = await api.post("/ai/organize/apply", { folders });
    return response.data;
};

/**
 * Streams an answer over server-sent events. Uses fetch (not axios) because
 * axios can't read a streaming response body in the browser.
 * The server keeps the history: pass the conversation to continue, or omit it to start one.
 */
export const streamChat = async (
    request: { message: string; conversationId?: string | null },
    handlers: {
        onConversation?: (conversation: { id: string; title: string }) => void;
        onSources: (sources: ChatSource[]) => void;
        onText: (text: string) => void;
        /** The model is reasoning before it answers */
        onThinking?: () => void;
        signal?: AbortSignal;
    }
) => {
    const response = await fetch(`${api.defaults.baseURL}/ai/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: request.message,
            ...(request.conversationId ? { conversationId: request.conversationId } : {}),
        }),
        signal: handlers.signal,
    });

    if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Chat request failed");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by a blank line
        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
            const raw = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            boundary = buffer.indexOf("\n\n");

            const event = raw.match(/^event: (.*)$/m)?.[1];
            const data = raw.match(/^data: (.*)$/m)?.[1];
            if (!event || data === undefined) continue;

            const payload = JSON.parse(data);
            if (event === "conversation") handlers.onConversation?.(payload);
            else if (event === "sources") handlers.onSources(payload);
            else if (event === "delta") handlers.onText(payload.text);
            else if (event === "status" && payload.phase === "thinking") handlers.onThinking?.();
            else if (event === "error") throw new Error(payload.message);
        }
    }
};
