import { createHash } from "crypto";
import prisma from "../config/prisma";
import { EMBEDDING_MODEL, isEmbeddingEnabled } from "../config/ai";
import { getLoadedYDoc } from "../config/yjsPersistence";
import { extractDocumentText, extractTextFromYDoc } from "../utils/documentExport";
import { EmbeddingRateLimitError, embedTexts, toVectorLiteral } from "./embedding.service";

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 200;

// Documents currently being indexed, and at most one queued re-run per document,
// so a save that lands mid-index is never dropped
const inFlight = new Map<string, Promise<void>>();
const queued = new Map<string, Promise<void>>();

/** Latest text of a document: the live Yjs doc if it's open, else the stored state. */
export const getDocumentText = (doc: {
    id: string;
    content: unknown;
    ydocState: Uint8Array | null;
}): string => {
    const live = getLoadedYDoc(doc.id);
    if (live) {
        return extractTextFromYDoc(live);
    }
    return extractDocumentText(
        doc.content,
        doc.ydocState ? Buffer.from(doc.ydocState) : null
    );
};

/** Split text into ~CHUNK_SIZE character chunks on paragraph boundaries. */
export const chunkText = (text: string): string[] => {
    const paragraphs = text
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean);

    const chunks: string[] = [];
    let current = "";

    for (const paragraph of paragraphs) {
        if (current && current.length + paragraph.length + 1 > CHUNK_SIZE) {
            chunks.push(current);
            // Carry the tail of the previous chunk over for context
            current = current.slice(-CHUNK_OVERLAP);
        }

        if (paragraph.length > CHUNK_SIZE) {
            // A single huge paragraph: hard-split it with overlap
            for (let i = 0; i < paragraph.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
                const piece = paragraph.slice(i, i + CHUNK_SIZE);
                if (current) {
                    chunks.push(current);
                    current = "";
                }
                chunks.push(piece);
            }
            continue;
        }

        current = current ? `${current}\n${paragraph}` : paragraph;
    }

    if (current.trim()) {
        chunks.push(current);
    }

    return chunks;
};

const runIndexDocument = async (documentId: string) => {
    const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
            id: true,
            title: true,
            content: true,
            ydocState: true,
            indexedHash: true,
            updatedAt: true,
        },
    });
    if (!doc) return;

    const title = doc.title || "Untitled Document";
    const text = getDocumentText(doc);
    // Prisma stores timestamps as UTC in "timestamp without time zone" columns
    const indexedAt = doc.updatedAt.toISOString();

    // Re-index when the text, the title, or the embedding setup changes
    const embeddingKey = isEmbeddingEnabled() ? EMBEDDING_MODEL : "none";
    const hash = createHash("sha256")
        .update(`${embeddingKey}\n${title}\n${text}`)
        .digest("hex");

    if (hash === doc.indexedHash) {
        // Content unchanged (e.g. a save with no edits): just mark it fresh
        await prisma.$executeRaw`
            UPDATE "Document" SET "indexedAt" = ${indexedAt}::timestamptz AT TIME ZONE 'UTC' WHERE "id" = ${documentId}`;
        return;
    }

    // An empty doc still gets one chunk so it can be found by title
    const chunks = chunkText(text);
    if (chunks.length === 0) {
        chunks.push(title);
    }

    const embeddings = isEmbeddingEnabled()
        ? await embedTexts(
              chunks.map((chunk) => `Title: ${title}\n\n${chunk}`),
              "document"
          )
        : null;

    await prisma.$transaction([
        prisma.documentChunk.deleteMany({ where: { documentId } }),
        ...chunks.map((chunk, i) => {
            const embedding = embeddings?.[i];
            return embedding
                ? prisma.$executeRaw`
                    INSERT INTO "DocumentChunk" ("id", "documentId", "chunkIndex", "content", "embedding")
                    VALUES (gen_random_uuid()::text, ${documentId}, ${i}, ${chunk}, ${toVectorLiteral(embedding)}::vector)`
                : prisma.$executeRaw`
                    INSERT INTO "DocumentChunk" ("id", "documentId", "chunkIndex", "content")
                    VALUES (gen_random_uuid()::text, ${documentId}, ${i}, ${chunk})`;
        }),
        // Raw SQL so the @updatedAt column (used for "recent documents") isn't bumped.
        // indexedAt is the version we read, so any later save still shows up as stale.
        prisma.$executeRaw`
            UPDATE "Document" SET "indexedHash" = ${hash}, "indexedAt" = ${indexedAt}::timestamptz AT TIME ZONE 'UTC'
            WHERE "id" = ${documentId}`,
    ]);
};

export const indexDocument = (documentId: string): Promise<void> => {
    const existing = inFlight.get(documentId);
    if (existing) {
        // The running pass may have read an older version: run once more after it
        let next = queued.get(documentId);
        if (!next) {
            next = existing
                .catch(() => undefined)
                .then(() => {
                    queued.delete(documentId);
                    return indexDocument(documentId);
                });
            queued.set(documentId, next);
        }
        return next;
    }

    const promise = runIndexDocument(documentId).finally(() => {
        inFlight.delete(documentId);
    });
    inFlight.set(documentId, promise);
    return promise;
};

/** Fire-and-forget indexing for save hooks; failures are logged, never thrown. */
export const scheduleIndexDocument = (documentId: string) => {
    indexDocument(documentId).catch((error) => {
        // Rate-limited docs stay stale and are picked up by the next ensureUserIndexed pass
        if (error instanceof EmbeddingRateLimitError) return;
        console.error(`Failed to index document ${documentId}:`, error.message);
    });
};

/** IDs of every document the user can read (owned + shared with them). */
export const getAccessibleDocumentIds = async (userId: string) => {
    const docs = await prisma.document.findMany({
        where: {
            OR: [{ ownerId: userId }, { permissions: { some: { userId } } }],
        },
        select: { id: true },
    });
    return docs.map((d) => d.id);
};

/**
 * Bring the user's index up to date: documents never indexed, changed since the
 * last index, or currently open in the editor. Returns how many are still stale.
 */
export const ensureUserIndexed = async (userId: string, maxDocs = 25) => {
    const docs = await prisma.document.findMany({
        where: {
            OR: [{ ownerId: userId }, { permissions: { some: { userId } } }],
        },
        select: { id: true, updatedAt: true, indexedAt: true },
        orderBy: { updatedAt: "desc" },
    });

    const stale = docs.filter(
        (d) =>
            !d.indexedAt ||
            d.indexedAt < d.updatedAt ||
            getLoadedYDoc(d.id) !== undefined
    );

    let indexed = 0;
    for (const doc of stale.slice(0, maxDocs)) {
        try {
            await indexDocument(doc.id);
            indexed++;
        } catch (error: any) {
            if (error instanceof EmbeddingRateLimitError) {
                // Every remaining doc would fail too; leave them stale for the next pass
                break;
            }
            console.error(`Failed to index document ${doc.id}:`, error.message);
        }
    }

    return {
        total: docs.length,
        pending: stale.length - indexed,
    };
};
