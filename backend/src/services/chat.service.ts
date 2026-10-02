import Groq from "groq-sdk";
import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import { getGroq, isEmbeddingEnabled, LLM_MODEL } from "../config/ai";
import { embedTexts, toVectorLiteral } from "./embedding.service";
import { ensureUserIndexed, getAccessibleDocumentIds } from "./indexing.service";

const MAX_EXCERPTS = 8;
const MAX_CATALOG_DOCS = 150;
const MAX_HISTORY_MESSAGES = 20;

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface ChatSource {
    index: number;
    documentId: string;
    title: string;
}

interface RetrievedChunk {
    documentId: string;
    title: string;
    content: string;
    score: number;
}

export interface ChatStreamHandlers {
    onSources: (sources: ChatSource[]) => void;
    onText: (text: string) => void;
    signal: AbortSignal;
}

const SYSTEM_PROMPT = `You are the assistant built into the user's document workspace (a Google Docs-style editor). People use it for class notes, work logs, meeting notes and personal updates, and over time they pile up. Your job is to help the user find, recall, summarize, compare and organize what they have written.

Each user turn carries the context for that turn:
- <workspace> lists the documents the user can access (title, folder, last edited date, and whether it's theirs or shared with them).
- <excerpts> holds the passages from those documents that best match the question, each numbered [n].

How to answer:
- Ground answers in the excerpts and the workspace list. Cite the excerpts you use with their number, like [1] or [2][3], right after the statement they support.
- If the excerpts don't contain the answer, say so plainly, and point to documents from the workspace list that look relevant by title. Never invent document contents.
- Questions about the workspace itself ("what did I write last week", "how many notes do I have on X", "which docs are about Y") can be answered from the workspace list.
- Keep answers concise and scannable; use short bullet lists for multiple items. Refer to documents by their title.
- Use plain text with "-" bullets and **bold** only; no tables or headings.`;

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

/** Vector search over the user's accessible chunks. */
const vectorSearch = async (documentIds: string[], query: string) => {
    const [queryEmbedding] = await embedTexts([query], "query");
    if (!queryEmbedding) return [];
    const vector = toVectorLiteral(queryEmbedding);

    const [, rows] = await prisma.$transaction([
        // pgvector >= 0.8: keep scanning the HNSW index until enough rows pass the filter
        prisma.$executeRaw`SET LOCAL hnsw.iterative_scan = relaxed_order`,
        prisma.$queryRaw<RetrievedChunk[]>`
            SELECT c."documentId", d."title", c."content",
                   1 - (c."embedding" <=> ${vector}::vector) AS "score"
            FROM "DocumentChunk" c
            JOIN "Document" d ON d."id" = c."documentId"
            WHERE c."documentId" IN (${Prisma.join(documentIds)})
              AND c."embedding" IS NOT NULL
            ORDER BY c."embedding" <=> ${vector}::vector
            LIMIT ${MAX_EXCERPTS}`,
    ]);

    return rows.sort((a, b) => b.score - a.score);
};

/** Keyword search fallback (any word may match), used when embeddings are off. */
const keywordSearch = async (documentIds: string[], query: string) => {
    return prisma.$queryRaw<RetrievedChunk[]>`
        WITH q AS (
            SELECT NULLIF(replace(plainto_tsquery('english', ${query})::text, '&', '|'), '')::tsquery AS query
        )
        SELECT c."documentId", d."title", c."content",
               ts_rank(to_tsvector('english', d."title" || ' ' || c."content"), q.query) AS "score"
        FROM "DocumentChunk" c
        JOIN "Document" d ON d."id" = c."documentId", q
        WHERE c."documentId" IN (${Prisma.join(documentIds)})
          AND q.query IS NOT NULL
          AND to_tsvector('english', d."title" || ' ' || c."content") @@ q.query
        ORDER BY "score" DESC
        LIMIT ${MAX_EXCERPTS}`;
};

const retrieveChunks = async (documentIds: string[], query: string) => {
    if (documentIds.length === 0) return [];

    if (isEmbeddingEnabled()) {
        try {
            return await vectorSearch(documentIds, query);
        } catch (error: any) {
            console.error("Vector search failed, using keyword search:", error.message);
        }
    }

    return keywordSearch(documentIds, query);
};

/** Compact list of the user's documents so the model can answer "what do I have" questions. */
const buildWorkspaceCatalog = async (userId: string, documentIds: string[]) => {
    if (documentIds.length === 0) return { text: "(no documents yet)", total: 0 };

    const docs = await prisma.document.findMany({
        where: { id: { in: documentIds } },
        select: {
            title: true,
            ownerId: true,
            updatedAt: true,
            folder: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: MAX_CATALOG_DOCS,
    });

    const lines = docs.map((d) => {
        const parts = [
            `"${d.title || "Untitled Document"}"`,
            `edited ${formatDate(d.updatedAt)}`,
            d.folder ? `folder: ${d.folder.name}` : null,
            d.ownerId === userId ? null : "shared with you",
        ].filter(Boolean);
        return `- ${parts.join(" | ")}`;
    });

    if (documentIds.length > docs.length) {
        lines.push(`- ...and ${documentIds.length - docs.length} older documents`);
    }

    return { text: lines.join("\n"), total: documentIds.length };
};

/** Number the excerpts; each number maps to its document so the UI can link citations. */
const buildExcerpts = (chunks: RetrievedChunk[]) => {
    const sources: ChatSource[] = chunks.map((chunk, i) => ({
        index: i + 1,
        documentId: chunk.documentId,
        title: chunk.title || "Untitled Document",
    }));

    const text = chunks
        .map((chunk, i) => `[${i + 1}] From "${sources[i]!.title}":\n${chunk.content}`)
        .join("\n\n");

    return { text: text || "(no matching passages found)", sources };
};

export const streamChat = async (
    userId: string,
    history: ChatMessage[],
    handlers: ChatStreamHandlers
) => {
    const messages = history.slice(-MAX_HISTORY_MESSAGES);
    const latest = messages[messages.length - 1];
    if (!latest || latest.role !== "user") {
        throw new Error("The last message must be from the user");
    }

    // Make sure recently edited docs are searchable before we retrieve
    await ensureUserIndexed(userId);

    const documentIds = await getAccessibleDocumentIds(userId);

    // Include the previous user turn so follow-ups like "and the second one?" still retrieve well
    const previousUser = [...messages.slice(0, -1)].reverse().find((m) => m.role === "user");
    const retrievalQuery = previousUser
        ? `${previousUser.content}\n${latest.content}`
        : latest.content;

    const [chunks, catalog] = await Promise.all([
        retrieveChunks(documentIds, retrievalQuery),
        buildWorkspaceCatalog(userId, documentIds),
    ]);

    const excerpts = buildExcerpts(chunks);
    handlers.onSources(excerpts.sources);

    const contextualizedLatest = `<workspace total_documents="${catalog.total}" today="${formatDate(new Date())}">
${catalog.text}
</workspace>

<excerpts>
${excerpts.text}
</excerpts>

${latest.content}`;

    const apiMessages: Groq.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: contextualizedLatest },
    ];

    const stream = await getGroq().chat.completions.create(
        {
            model: LLM_MODEL,
            messages: apiMessages,
            stream: true,
            max_completion_tokens: 8192,
            // Chat is latency-sensitive: think briefly, and keep reasoning out of the reply
            reasoning_effort: "low",
            include_reasoning: false,
        },
        { signal: handlers.signal }
    );

    let finishReason: string | null = null;
    for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (choice?.delta?.content) {
            handlers.onText(choice.delta.content);
        }
        if (choice?.finish_reason) {
            finishReason = choice.finish_reason;
        }
    }

    if (finishReason === "length") {
        handlers.onText("\n\n_(Answer was cut off because it got too long.)_");
    }
};
