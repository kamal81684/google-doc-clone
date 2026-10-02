import OpenAI from "openai";

// Any OpenAI-compatible chat completions endpoint powers the chat assistant and
// proposes folder structures: Groq (default), OpenAI, a LiteLLM proxy, OpenRouter, Ollama...
export const LLM_BASE_URL = process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
export const LLM_MODEL = process.env.LLM_MODEL || "openai/gpt-oss-120b";
// Per-feature overrides; both fall back to LLM_MODEL. The organize model must support
// strict JSON-schema output (response_format: json_schema).
export const LLM_CHAT_MODEL = process.env.LLM_CHAT_MODEL || LLM_MODEL;
export const LLM_ORGANIZE_MODEL = process.env.LLM_ORGANIZE_MODEL || LLM_MODEL;

// Voyage AI embeddings. Must match the vector(1024) column in DocumentChunk.
export const EMBEDDING_MODEL = "voyage-3.5";
export const EMBEDDING_DIMENSIONS = 1024;

let llmClient: OpenAI | null = null;

export const isChatEnabled = () => Boolean(process.env.LLM_API_KEY);

// Without a Voyage key, chat still works using keyword (full-text) retrieval.
export const isEmbeddingEnabled = () => Boolean(process.env.VOYAGE_API_KEY);

// Optional: TypeSafe assigns documents to folders with a calibrated confidence.
// Without it, the LLM's own grouping is used.
export const isTypeSafeEnabled = () => Boolean(process.env.TYPESAFE_API_KEY);

export const getLLM = (): OpenAI => {
    if (!llmClient) {
        llmClient = new OpenAI({ apiKey: process.env.LLM_API_KEY, baseURL: LLM_BASE_URL });
    }
    return llmClient;
};

export type ReasoningEffort = "off" | "low" | "medium" | "high";

const REASONING_EFFORTS: ReasoningEffort[] = ["off", "low", "medium", "high"];

/**
 * Chat is latency-sensitive: with reasoning on, nothing is shown until the model finishes
 * thinking (several seconds on Sarvam). Answering from retrieved excerpts rarely needs it.
 */
export const LLM_CHAT_REASONING: ReasoningEffort = REASONING_EFFORTS.includes(
    process.env.LLM_CHAT_REASONING as ReasoningEffort
)
    ? (process.env.LLM_CHAT_REASONING as ReasoningEffort)
    : "off";

/**
 * Reasoning knobs differ between providers, so only send what the endpoint accepts.
 * Set LLM_REASONING=false for models that reject reasoning_effort (e.g. gpt-4o, most Ollama models).
 */
export const reasoningParams = (effort: ReasoningEffort): Record<string, unknown> => {
    if (process.env.LLM_REASONING === "false") return {};
    const isGroq = LLM_BASE_URL.includes("groq.com");

    if (effort === "off") {
        // Sarvam thinks by default and only stops when told to with an explicit null;
        // Groq's gpt-oss can't switch reasoning off, so use its lowest level;
        // elsewhere, leave the provider's default
        if (LLM_BASE_URL.includes("sarvam.ai")) return { reasoning_effort: null };
        if (!isGroq) return {};
        effort = "low";
    }

    // Groq-only: keep the model's reasoning out of the returned content
    return { reasoning_effort: effort, ...(isGroq ? { include_reasoning: false } : {}) };
};

/**
 * Output-token limit under the parameter name the provider honours. OpenAI and Groq use
 * max_completion_tokens; Sarvam (and many self-hosted / older servers) only read max_tokens and
 * otherwise fall back to a small default, which reasoning models can use up before answering.
 * Override with LLM_MAX_TOKENS_PARAM, and cap with LLM_MAX_OUTPUT_TOKENS for plan limits.
 */
export const maxTokensParam = (requested: number): Record<string, number> => {
    const param =
        process.env.LLM_MAX_TOKENS_PARAM ||
        (LLM_BASE_URL.includes("sarvam.ai") ? "max_tokens" : "max_completion_tokens");
    const cap = Number(process.env.LLM_MAX_OUTPUT_TOKENS) || Infinity;
    return { [param]: Math.min(requested, cap) };
};
