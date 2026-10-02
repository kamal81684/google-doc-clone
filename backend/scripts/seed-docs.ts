/**
 * Dev seed: creates a set of realistic documents for one user through the real API,
 * so they are saved, indexed and embedded exactly like documents written in the editor.
 *
 *   npx tsx scripts/seed-docs.ts <user-email>
 *
 * 1. POST /documents + PATCH /documents/:id (title)
 * 2. Connect to /ws as a collaborator and write the body into the Yjs "tiptap" fragment
 * 3. Disconnect: the server persists the Yjs state and schedules indexing (chunks + embeddings)
 * 4. GET /ai/status to make sure the user's index is brought up to date
 *
 * Auth uses a token signed with the backend's own JWT_SECRET (same as generateToken),
 * so the backend must be running with this .env.
 */
// Must stay the first import: imports are hoisted, and config modules read process.env on load
import "dotenv/config";

import * as Y from "yjs";
import WebSocket from "ws";
import * as syncProtocol from "y-protocols/sync";
import * as encoding from "lib0/encoding";
import { PrismaClient } from "@prisma/client";
import { generateToken } from "../src/utils/generateToken";
import { SEED_DOCS, Block } from "./seed-docs.data";

const PORT = process.env.PORT || 5000;
const API = `http://localhost:${PORT}/api/v1`;
const WS = `ws://localhost:${PORT}/ws`;

const prisma = new PrismaClient();

const buildFragment = (doc: Y.Doc, blocks: Block[]) => {
    const fragment = doc.getXmlFragment("tiptap");
    const paragraph = (text: string) => {
        const p = new Y.XmlElement("paragraph");
        p.insert(0, [new Y.XmlText(text)]);
        return p;
    };

    const nodes = blocks.map((block) => {
        if ("h" in block) {
            const heading = new Y.XmlElement("heading");
            // y-prosemirror stores node attrs as-is, so level stays a number
            heading.setAttribute("level", (block.level ?? 2) as any);
            heading.insert(0, [new Y.XmlText(block.h)]);
            return heading;
        }
        if ("ul" in block || "ol" in block) {
            const list = new Y.XmlElement("ul" in block ? "bulletList" : "orderedList");
            const items = "ul" in block ? block.ul : block.ol;
            list.insert(
                0,
                items.map((text) => {
                    const li = new Y.XmlElement("listItem");
                    li.insert(0, [paragraph(text)]);
                    return li;
                })
            );
            return list;
        }
        return paragraph(block.p);
    });

    fragment.insert(0, nodes);
};

/** Push a Y.Doc's full state to the server over the collaboration socket, then disconnect. */
const pushContent = (documentId: string, token: string, ydoc: Y.Doc) =>
    new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`${WS}?doc=${documentId}`, {
            headers: { Cookie: `token=${token}` },
        });
        // The server loads the doc from the database before it starts listening, so wait for
        // its first sync message; anything sent earlier would be dropped
        ws.once("message", () => {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, 0); // messageSync
            syncProtocol.writeUpdate(encoder, Y.encodeStateAsUpdate(ydoc));
            ws.send(encoding.toUint8Array(encoder));
            // Give the server a moment to apply the update before closing (close triggers save + index)
            setTimeout(() => ws.close(), 400);
        });
        ws.on("close", () => resolve());
        ws.on("error", reject);
    });

const api = async (token: string, method: string, path: string, body?: unknown) => {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: { "Content-Type": "application/json", Cookie: `token=${token}` },
        body: body ? JSON.stringify(body) : null,
    });
    const json = await res.json();
    if (!res.ok || json.success === false) {
        throw new Error(`${method} ${path} -> ${res.status}: ${json.message}`);
    }
    return json;
};

const main = async () => {
    const email = process.argv[2];
    if (!email) throw new Error("Usage: npx tsx scripts/seed-docs.ts <user-email>");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error(`No user with email ${email}`);
    const token = generateToken(user.id);

    const existing = await prisma.document.findMany({
        where: { ownerId: user.id },
        select: { id: true, title: true, ydocState: true },
    });

    for (const seed of SEED_DOCS) {
        const match = existing.find((d) => d.title === seed.title);
        // An empty Y.Doc encodes to 2 bytes: treat that as "created but never filled"
        if (match && (match.ydocState?.length ?? 0) > 2) {
            console.log(`skip   ${seed.title} (already exists)`);
            continue;
        }

        let documentId = match?.id;
        if (!documentId) {
            const { document } = await api(token, "POST", "/documents");
            await api(token, "PATCH", `/documents/${document.id}`, { title: seed.title });
            documentId = document.id as string;
        }

        const ydoc = new Y.Doc();
        buildFragment(ydoc, seed.blocks);
        await pushContent(documentId, token, ydoc);
        console.log(`${match ? "fill  " : "create"} ${seed.title}`);
    }

    // Saves index in the background; give them a moment, then let the status endpoint catch up the rest
    await new Promise((r) => setTimeout(r, 3000));
    const status = await api(token, "GET", "/ai/status");
    console.log("ai status:", JSON.stringify(status));
};

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
