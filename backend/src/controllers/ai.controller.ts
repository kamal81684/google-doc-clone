import { Request, Response } from "express";
import { z } from "zod";
import { isChatEnabled, isEmbeddingEnabled, isTypeSafeEnabled } from "../config/ai";
import { ChatSource, streamChat } from "../services/chat.service";
import {
    createConversation,
    deleteConversation,
    deleteIfEmpty,
    getConversation,
    getHistoryForModel,
    listConversations,
    saveTurn,
} from "../services/conversation.service";
import { ensureUserIndexed } from "../services/indexing.service";
import {
    applyOrganization,
    ApplyOrganizationSchema,
    proposeOrganization,
} from "../services/organize.service";

const ChatRequestSchema = z.object({
    // Omit to start a new conversation
    conversationId: z.string().min(1).optional(),
    message: z.string().trim().min(1).max(8000),
});

const aiDisabledResponse = (res: Response) =>
    res.status(503).json({
        success: false,
        message: "AI features are not configured on the server (missing LLM_API_KEY)",
    });

/** Feature flags for the UI; also kicks off indexing in the background so chat is ready sooner. */
export const getAiStatus = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    if (isChatEnabled()) {
        ensureUserIndexed(userId).catch((error) => {
            console.error("Background indexing failed:", error.message);
        });
    }

    return res.status(200).json({
        success: true,
        chatEnabled: isChatEnabled(),
        semanticSearch: isEmbeddingEnabled(),
        smartFiling: isTypeSafeEnabled(),
    });
};

export const chat = async (req: Request, res: Response) => {
    if (!isChatEnabled()) return aiDisabledResponse(res);

    const parsed = ChatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid chat request",
        });
    }

    const userId = (req as any).user.id;
    const { conversationId: requestedId, message } = parsed.data;

    // History comes from the database, not the client
    let conversation: { id: string; title: string };
    let history: { role: "user" | "assistant"; content: string }[] = [];
    if (requestedId) {
        const existing = await getConversation(userId, requestedId);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Conversation not found" });
        }
        conversation = { id: existing.id, title: existing.title };
        history = await getHistoryForModel(existing.id);
    } else {
        conversation = await createConversation(userId, message);
    }

    // Server-sent events: "conversation", "sources", maybe "status", then many "delta", then "done" (or "error")
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (event: string, data: unknown) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Stop generating (and paying for) tokens if the user closes the panel
    const abort = new AbortController();
    res.on("close", () => abort.abort());

    send("conversation", conversation);

    let answer = "";
    let sources: ChatSource[] = [];
    try {
        await streamChat(userId, [...history, { role: "user", content: message }], {
            signal: abort.signal,
            onSources: (s) => {
                sources = s;
                send("sources", s);
            },
            onThinking: () => send("status", { phase: "thinking" }),
            onText: (text) => {
                answer += text;
                send("delta", { text });
            },
        });
        send("done", {});
    } catch (error: any) {
        if (!abort.signal.aborted) {
            console.error("Chat failed:", error);
            send("error", { message: "Something went wrong while answering. Please try again." });
        }
    } finally {
        res.end();
        // Keep any answer the user saw, including one they stopped part-way
        try {
            if (answer.trim()) {
                await saveTurn(conversation.id, message, answer, sources);
            } else if (!requestedId) {
                await deleteIfEmpty(conversation.id);
            }
        } catch (error: any) {
            console.error("Failed to save chat turn:", error.message);
        }
    }
};

export const proposeOrganize = async (req: Request, res: Response) => {
    if (!isChatEnabled()) return aiDisabledResponse(res);

    try {
        const userId = (req as any).user.id;

        const proposal = await proposeOrganization(userId);

        return res.status(200).json({
            success: true,
            proposal,
        });
    } catch (error: any) {
        console.error("Organize proposal failed:", error);
        return res.status(500).json({
            success: false,
            message: "Couldn't generate a folder plan. Please try again.",
        });
    }
};

export const applyOrganize = async (req: Request, res: Response) => {
    const parsed = ApplyOrganizationSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid folder plan",
        });
    }

    try {
        const userId = (req as any).user.id;

        const result = await applyOrganization(userId, parsed.data);

        return res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getConversations = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const conversations = await listConversations(userId);
    return res.status(200).json({ success: true, conversations });
};

export const getConversationById = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const conversation = await getConversation(userId, req.params.id as string);
    if (!conversation) {
        return res.status(404).json({ success: false, message: "Conversation not found" });
    }
    return res.status(200).json({ success: true, conversation });
};

export const removeConversation = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const deleted = await deleteConversation(userId, req.params.id as string);
    if (!deleted) {
        return res.status(404).json({ success: false, message: "Conversation not found" });
    }
    return res.status(200).json({ success: true });
};
