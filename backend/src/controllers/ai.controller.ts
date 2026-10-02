import { Request, Response } from "express";
import { z } from "zod";
import { isChatEnabled, isEmbeddingEnabled, isTypeSafeEnabled } from "../config/ai";
import { streamChat } from "../services/chat.service";
import { ensureUserIndexed } from "../services/indexing.service";
import {
    applyOrganization,
    ApplyOrganizationSchema,
    proposeOrganization,
} from "../services/organize.service";

const ChatRequestSchema = z.object({
    messages: z
        .array(
            z.object({
                role: z.enum(["user", "assistant"]),
                content: z.string().trim().min(1).max(8000),
            })
        )
        .min(1)
        .max(50),
});

const aiDisabledResponse = (res: Response) =>
    res.status(503).json({
        success: false,
        message: "AI features are not configured on the server (missing GROQ_API_KEY)",
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

    // Server-sent events: "sources", then many "delta", then "done" (or "error")
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

    try {
        await streamChat(userId, parsed.data.messages, {
            signal: abort.signal,
            onSources: (sources) => send("sources", sources),
            onText: (text) => send("delta", { text }),
        });
        send("done", {});
    } catch (error: any) {
        if (!abort.signal.aborted) {
            console.error("Chat failed:", error);
            send("error", { message: "Something went wrong while answering. Please try again." });
        }
    } finally {
        res.end();
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
