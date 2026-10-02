import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "../config/ai";

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const BATCH_SIZE = 64;

type InputType = "document" | "query";

// Voyage's free tier allows only 3 requests per minute. After a 429, skip calls until the
// window has passed instead of firing more requests that are guaranteed to fail.
const RATE_LIMIT_COOLDOWN_MS = 60_000;
let rateLimitedUntil = 0;

export class EmbeddingRateLimitError extends Error {
    constructor(public retryAt: number) {
        super(`Embedding rate limit hit; retrying after ${new Date(retryAt).toISOString()}`);
    }
}

interface VoyageResponse {
    data: { embedding: number[]; index: number }[];
}

const embedBatch = async (inputs: string[], inputType: InputType) => {
    if (Date.now() < rateLimitedUntil) {
        throw new EmbeddingRateLimitError(rateLimitedUntil);
    }

    const response = await fetch(VOYAGE_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            input: inputs,
            model: EMBEDDING_MODEL,
            input_type: inputType,
            output_dimension: EMBEDDING_DIMENSIONS,
        }),
    });

    if (response.status === 429) {
        const retryAfterSeconds = Number(response.headers.get("retry-after"));
        rateLimitedUntil =
            Date.now() +
            (retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : RATE_LIMIT_COOLDOWN_MS);
        throw new EmbeddingRateLimitError(rateLimitedUntil);
    }

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Embedding request failed (${response.status}): ${body.slice(0, 300)}`);
    }

    const json = (await response.json()) as VoyageResponse;
    return [...json.data]
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);
};

export const embedTexts = async (
    texts: string[],
    inputType: InputType
): Promise<number[][]> => {
    const result: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        result.push(...(await embedBatch(texts.slice(i, i + BATCH_SIZE), inputType)));
    }
    return result;
};

/** pgvector literal, e.g. "[0.1,0.2,...]" — used with a ::vector cast in SQL. */
export const toVectorLiteral = (embedding: number[]) => `[${embedding.join(",")}]`;
