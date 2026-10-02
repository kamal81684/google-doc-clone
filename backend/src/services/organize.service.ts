import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import { getGroq, isTypeSafeEnabled, LLM_MODEL } from "../config/ai";
import { getDocumentText } from "./indexing.service";

const MAX_DOCS_PER_RUN = 200;
const EXCERPT_LENGTH = 400;
const TYPESAFE_URL = "https://api.typesafe.ai/v1/systemone";
const TYPESAFE_CONCURRENCY = 5;
// Below this, a document is left for the user to file by hand.
// Starting point — tune it against real users' documents.
const MIN_ASSIGN_CONFIDENCE = 0.5;
const NO_FOLDER_OPTION = "__none__";

export interface ProposedDocument {
    id: string;
    title: string;
    confidence: number | null;
}

export interface ProposedFolder {
    name: string;
    description: string;
    existingFolderId: string | null;
    documents: ProposedDocument[];
}

export interface OrganizeProposal {
    folders: ProposedFolder[];
    unassigned: ProposedDocument[];
    remaining: number;
    assignedBy: "typesafe" | "llm";
}

const ProposalSchema = z.object({
    folders: z.array(
        z.object({
            name: z.string().describe("Short folder name, 1-3 words, Title Case"),
            description: z
                .string()
                .describe("One sentence describing what belongs in this folder"),
            document_keys: z
                .array(z.string())
                .describe("Keys (like d3) of the documents that belong in this folder"),
        })
    ),
});

const ORGANIZE_PROMPT = `You organize a person's documents into folders. They might be a student taking class notes or someone at a company logging work updates.

Propose a small set of folders (usually 3-10) that group the documents below by topic, project, course or purpose — whatever is most useful for finding things later. Guidelines:
- Reuse an existing folder (listed in <existing_folders>) when it fits; use its exact name.
- Prefer specific, meaningful names ("Operating Systems", "Q3 Launch") over generic ones ("Misc", "Notes", "Documents").
- Don't make a folder for a single document unless it clearly stands alone; leave documents that fit nowhere out of every folder.
- Each document goes in at most one folder. Only use document keys from the list.

Respond with JSON only, matching the provided schema.`;

interface UnfiledDoc {
    key: string;
    id: string;
    title: string;
    excerpt: string;
}

const loadUnfiledDocs = async (userId: string) => {
    const where = { ownerId: userId, folderId: null };
    const [docs, total] = await Promise.all([
        prisma.document.findMany({
            where,
            select: { id: true, title: true, content: true, ydocState: true },
            orderBy: { updatedAt: "desc" },
            take: MAX_DOCS_PER_RUN,
        }),
        prisma.document.count({ where }),
    ]);

    const unfiled: UnfiledDoc[] = docs.map((doc, i) => ({
        key: `d${i + 1}`,
        id: doc.id,
        title: doc.title || "Untitled Document",
        excerpt: getDocumentText(doc).replace(/\s+/g, " ").trim().slice(0, EXCERPT_LENGTH),
    }));

    return { unfiled, remaining: total - docs.length };
};

// Strict mode on Groq needs a plain JSON Schema (all fields required, no extra properties)
const { $schema: _ignored, ...PROPOSAL_JSON_SCHEMA } = z.toJSONSchema(ProposalSchema);

/** Step 1: the LLM reads titles + excerpts and proposes folders (and a first grouping). */
const proposeFolders = async (
    docs: UnfiledDoc[],
    existingFolders: { name: string; description: string | null }[]
) => {
    const docList = docs
        .map((d) => `<doc key="${d.key}" title="${d.title.replace(/"/g, "'")}">${d.excerpt}</doc>`)
        .join("\n");
    const folderList = existingFolders.length
        ? existingFolders
              .map((f) => `- ${f.name}${f.description ? `: ${f.description}` : ""}`)
              .join("\n")
        : "(none)";

    const response = await getGroq().chat.completions.create({
        model: LLM_MODEL,
        max_completion_tokens: 16000,
        reasoning_effort: "medium",
        include_reasoning: false,
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "folder_plan",
                strict: true,
                schema: PROPOSAL_JSON_SCHEMA,
            },
        },
        messages: [
            { role: "system", content: ORGANIZE_PROMPT },
            {
                role: "user",
                content: `<existing_folders>\n${folderList}\n</existing_folders>\n\n<documents>\n${docList}\n</documents>`,
            },
        ],
    });

    const content = response.choices[0]?.message.content;
    const parsed = content ? ProposalSchema.safeParse(JSON.parse(content)) : null;
    if (!parsed?.success) {
        throw new Error("Couldn't generate a folder plan. Please try again.");
    }

    return parsed.data.folders;
};

interface TypeSafeChoiceAnswer {
    type: "choice";
    choice: string;
    confidence: number;
}

/** Step 2 (optional): TypeSafe picks each document's folder with a calibrated confidence. */
const assignWithTypeSafe = async (
    doc: UnfiledDoc,
    folders: { name: string; description: string }[]
) => {
    const criteria: Record<string, string> = {};
    folders.forEach((f, i) => {
        criteria[`folder_${i}`] = `${f.name}: ${f.description}`;
    });
    criteria[NO_FOLDER_OPTION] = "None of these folders is a good fit for this document";

    const response = await fetch(TYPESAFE_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "jev-latest",
            state: { document: { title: doc.title, beginning: doc.excerpt } },
            questions: {
                folder: {
                    type: "choice",
                    instructions:
                        "Which folder should `document` be filed in, based on its title and beginning? Pick the folder whose description best matches what the document is about.",
                    criteria,
                },
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`TypeSafe request failed (${response.status})`);
    }

    const json = (await response.json()) as { answers: { folder: TypeSafeChoiceAnswer } };
    const answer = json.answers.folder;
    const folderIndex =
        answer.choice === NO_FOLDER_OPTION ? null : Number(answer.choice.replace("folder_", ""));

    return { folderIndex, confidence: answer.confidence };
};

const mapWithConcurrency = async <T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>
): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
            const i = next++;
            results[i] = await fn(items[i]!);
        }
    });
    await Promise.all(workers);
    return results;
};

export const proposeOrganization = async (userId: string): Promise<OrganizeProposal> => {
    const [{ unfiled, remaining }, existingFolders] = await Promise.all([
        loadUnfiledDocs(userId),
        prisma.folder.findMany({
            where: { ownerId: userId },
            select: { id: true, name: true, description: true },
        }),
    ]);

    if (unfiled.length === 0) {
        return { folders: [], unassigned: [], remaining: 0, assignedBy: "llm" };
    }

    const plan = await proposeFolders(unfiled, existingFolders);

    // Merge duplicate names and attach existing folder ids
    const folders: ProposedFolder[] = [];
    const llmAssignment = new Map<string, number>();
    for (const proposed of plan) {
        const name = proposed.name.trim().slice(0, 60);
        if (!name) continue;
        let index = folders.findIndex((f) => f.name.toLowerCase() === name.toLowerCase());
        if (index === -1) {
            const existing = existingFolders.find(
                (f) => f.name.toLowerCase() === name.toLowerCase()
            );
            folders.push({
                name: existing?.name ?? name,
                description: existing?.description || proposed.description,
                existingFolderId: existing?.id ?? null,
                documents: [],
            });
            index = folders.length - 1;
        }
        for (const key of proposed.document_keys) {
            if (!llmAssignment.has(key)) llmAssignment.set(key, index);
        }
    }

    const unassigned: ProposedDocument[] = [];
    let assignedBy: OrganizeProposal["assignedBy"] = "llm";

    let typesafeResults: { folderIndex: number | null; confidence: number }[] | null = null;
    if (isTypeSafeEnabled() && folders.length > 0) {
        try {
            typesafeResults = await mapWithConcurrency(unfiled, TYPESAFE_CONCURRENCY, (doc) =>
                assignWithTypeSafe(doc, folders)
            );
            assignedBy = "typesafe";
        } catch (error: any) {
            console.error("TypeSafe assignment failed, using the LLM's grouping:", error.message);
        }
    }

    unfiled.forEach((doc, i) => {
        const result = typesafeResults?.[i];
        const folderIndex = result
            ? result.confidence >= MIN_ASSIGN_CONFIDENCE
                ? result.folderIndex
                : null
            : llmAssignment.get(doc.key) ?? null;
        const entry = { id: doc.id, title: doc.title, confidence: result?.confidence ?? null };

        const folder = folderIndex === null ? undefined : folders[folderIndex];
        if (folder) {
            folder.documents.push(entry);
        } else {
            unassigned.push(entry);
        }
    });

    return {
        // Drop proposed (new) folders that ended up empty
        folders: folders.filter((f) => f.documents.length > 0),
        unassigned,
        remaining,
        assignedBy,
    };
};

export const ApplyOrganizationSchema = z.object({
    folders: z
        .array(
            z.object({
                name: z.string().trim().min(1).max(60),
                description: z.string().max(300).optional(),
                documentIds: z.array(z.string()).max(MAX_DOCS_PER_RUN),
            })
        )
        .max(50),
});

/** Create the accepted folders (or reuse same-named ones) and move the documents in. */
export const applyOrganization = async (
    userId: string,
    plan: z.infer<typeof ApplyOrganizationSchema>
) => {
    let moved = 0;

    for (const proposed of plan.folders) {
        if (proposed.documentIds.length === 0) continue;

        const folder = await prisma.folder.upsert({
            where: { ownerId_name: { ownerId: userId, name: proposed.name } },
            update: {},
            create: {
                ownerId: userId,
                name: proposed.name,
                description: proposed.description ?? null,
            },
        });

        // Raw SQL so moving a document doesn't bump its "last edited" time
        moved += await prisma.$executeRaw`
            UPDATE "Document" SET "folderId" = ${folder.id}
            WHERE "ownerId" = ${userId} AND "id" IN (${Prisma.join(proposed.documentIds)})`;
    }

    return { moved };
};
