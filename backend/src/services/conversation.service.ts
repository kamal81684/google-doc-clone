import { ConversationRole, Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import type { ChatMessage, ChatSource } from "./chat.service";

const TITLE_LENGTH = 80;
const LIST_LIMIT = 50;
// Matches what streamChat sends to the model; older turns stay visible in the UI
const HISTORY_FOR_MODEL = 20;

export const conversationTitle = (question: string) => {
    const oneLine = question.replace(/\s+/g, " ").trim();
    return oneLine.length > TITLE_LENGTH ? `${oneLine.slice(0, TITLE_LENGTH - 1)}…` : oneLine;
};

export const listConversations = (userId: string) =>
    prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: LIST_LIMIT,
        select: { id: true, title: true, updatedAt: true },
    });

/** A conversation with all its messages, or null if it isn't this user's. */
export const getConversation = async (userId: string, conversationId: string) => {
    const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
        select: {
            id: true,
            title: true,
            updatedAt: true,
            messages: {
                orderBy: { createdAt: "asc" },
                select: { id: true, role: true, content: true, sources: true, createdAt: true },
            },
        },
    });
    if (!conversation) return null;

    return {
        ...conversation,
        messages: conversation.messages.map((m) => ({
            ...m,
            role: m.role === ConversationRole.USER ? ("user" as const) : ("assistant" as const),
            sources: (m.sources as ChatSource[] | null) ?? undefined,
        })),
    };
};

/** Recent turns in the shape the chat model expects. */
export const getHistoryForModel = async (conversationId: string): Promise<ChatMessage[]> => {
    const recent = await prisma.conversationMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        take: HISTORY_FOR_MODEL,
        select: { role: true, content: true },
    });
    return recent.reverse().map((m) => ({
        role: m.role === ConversationRole.USER ? "user" : "assistant",
        content: m.content,
    }));
};

export const createConversation = (userId: string, firstQuestion: string) =>
    prisma.conversation.create({
        data: { userId, title: conversationTitle(firstQuestion) },
        select: { id: true, title: true },
    });

/** Store a completed question/answer pair and bump the conversation to the top of the list. */
export const saveTurn = (
    conversationId: string,
    question: string,
    answer: string,
    sources: ChatSource[]
) => {
    const now = Date.now();
    return prisma.$transaction([
        prisma.conversationMessage.create({
            data: {
                conversationId,
                role: ConversationRole.USER,
                content: question,
                createdAt: new Date(now),
            },
        }),
        prisma.conversationMessage.create({
            data: {
                conversationId,
                role: ConversationRole.ASSISTANT,
                content: answer,
                sources: sources as unknown as Prisma.InputJsonValue,
                // Strictly after the question so ordering by createdAt is stable
                createdAt: new Date(now + 1),
            },
        }),
        prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date(now) },
        }),
    ]);
};

/** Remove a conversation that never got a saved turn (e.g. the first answer failed). */
export const deleteIfEmpty = (conversationId: string) =>
    prisma.conversation.deleteMany({
        where: { id: conversationId, messages: { none: {} } },
    });

export const deleteConversation = async (userId: string, conversationId: string) => {
    const { count } = await prisma.conversation.deleteMany({
        where: { id: conversationId, userId },
    });
    return count > 0;
};
