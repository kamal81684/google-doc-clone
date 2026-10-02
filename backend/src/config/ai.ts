import Groq from "groq-sdk";

// Groq-hosted LLM that powers the chat assistant and proposes folder structures.
// gpt-oss-120b supports both streaming and strict JSON-schema output on Groq.
export const LLM_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

// Voyage AI embeddings. Must match the vector(1024) column in DocumentChunk.
export const EMBEDDING_MODEL = "voyage-3.5";
export const EMBEDDING_DIMENSIONS = 1024;

let groqClient: Groq | null = null;

export const isChatEnabled = () => Boolean(process.env.GROQ_API_KEY);

// Without a Voyage key, chat still works using keyword (full-text) retrieval.
export const isEmbeddingEnabled = () => Boolean(process.env.VOYAGE_API_KEY);

// Optional: TypeSafe assigns documents to folders with a calibrated confidence.
// Without it, the LLM's own grouping is used.
export const isTypeSafeEnabled = () => Boolean(process.env.TYPESAFE_API_KEY);

export const getGroq = (): Groq => {
    if (!groqClient) {
        groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
    return groqClient;
};
