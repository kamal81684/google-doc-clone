import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import jwt from "jsonwebtoken";
import { URL } from "url";
import { clearYDoc, getYDoc, saveYDoc } from "./config/yjsPersistence";
import { scheduleIndexDocument } from "./services/indexing.service";
import { checkDocumentAccess } from "./services/permission.service";

const messageSync = 0;
const messageAwareness = 1;
const messageQueryAwareness = 3;

interface ConnMeta {
  userId: string | null;
  userName: string;
  documentId: string;
  readOnly: boolean;
}

const conns = new Map<WebSocket, ConnMeta>();
const docConns = new Map<string, Set<WebSocket>>();
const docAwareness = new Map<string, awarenessProtocol.Awareness>();

function handleMessage(
  data: Uint8Array,
  docName: string,
  ydoc: Y.Doc,
  awareness: awarenessProtocol.Awareness,
  sender: WebSocket,
  readOnly: boolean
) {
  const decoder = decoding.createDecoder(data);
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case messageSync: {
      // Viewers may ask for the document (sync step 1) but their edits are dropped:
      // the editor's read-only mode is only a UI hint, this is the enforcement
      if (readOnly && decoding.peekVarUint(decoder) !== syncProtocol.messageYjsSyncStep1) {
        break;
      }
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.readSyncMessage(decoder, encoder, ydoc, null);
      if (encoding.length(encoder) > 1) {
        sender.send(encoding.toUint8Array(encoder));
      }
      break;
    }
    case messageAwareness: {
      const update = decoding.readVarUint8Array(decoder);
      awarenessProtocol.applyAwarenessUpdate(awareness, update, sender);
      break;
    }
    case messageQueryAwareness: {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          awareness,
          Array.from(awareness.getStates().keys())
        )
      );
      sender.send(encoding.toUint8Array(encoder));
      break;
    }
  }
}

function broadcast(
  data: Uint8Array,
  docName: string,
  sender: WebSocket
) {
  const connsForDoc = docConns.get(docName);
  if (!connsForDoc) return;
  for (const conn of connsForDoc) {
    if (conn !== sender && conn.readyState === WebSocket.OPEN) {
      conn.send(data);
    }
  }
}

export const setupWebSocket = (server: any) => {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket: any, head: Buffer) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    const docName = url.searchParams.get("doc");
    if (!docName) {
      socket.destroy();
      return;
    }

    const cookies = (req.headers.cookie || "")
      .split(";")
      .reduce<Record<string, string>>((acc, c) => {
        const [key, ...val] = c.trim().split("=");
        if (key) acc[key] = val.join("=");
        return acc;
      }, {});

    // No (valid) session is fine: link sharing can open a document to anonymous visitors,
    // and checkDocumentAccess decides
    let userId: string | null = null;
    let userName = "Anonymous";
    const token = cookies.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
          id: string;
          name?: string;
          email?: string;
        };
        userId = decoded.id;
        userName = decoded.name || decoded.email || "Anonymous";
      } catch {
        // Expired or invalid session: continue as an anonymous visitor
      }
    }

    checkDocumentAccess(docName, userId)
      .then((access) => {
        if (!access) {
          const status = userId ? "403 Forbidden" : "401 Unauthorized";
          socket.write(`HTTP/1.1 ${status}\r\n\r\n`);
          socket.destroy();
          return;
        }

        const readOnly = access === "VIEWER";
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit("connection", ws, req, { userId, userName, docName, readOnly });
        });
      })
      .catch(() => {
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
      });
  });

  wss.on(
    "connection",
    async (
      ws: WebSocket,
      _req: IncomingMessage,
      meta: { userId: string | null; userName: string; docName: string; readOnly: boolean }
    ) => {
      const { userId, userName, docName, readOnly } = meta;
      let ydoc: Y.Doc;
      try {
        ydoc = await getYDoc(docName);
      } catch {
        ws.close();
        return;
      }

      // Get or create awareness for this doc
      if (!docAwareness.has(docName)) {
        docAwareness.set(
          docName,
          new awarenessProtocol.Awareness(ydoc)
        );
        docAwareness.get(docName)!.setLocalState(null);
      }
      const awareness = docAwareness.get(docName)!;

      conns.set(ws, { userId, userName, documentId: docName, readOnly });
      if (!docConns.has(docName)) {
        docConns.set(docName, new Set());
      }
      docConns.get(docName)!.add(ws);

      // Listen for updates and broadcast to others
      const updateHandler = (update: Uint8Array, origin: any) => {
        if (origin !== ws) {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.writeUpdate(encoder, update);
          const msg = encoding.toUint8Array(encoder);
          broadcast(msg, docName, ws);
        }
      };
      ydoc.on("update", updateHandler);

      // Listen for awareness changes and broadcast
      const awarenessHandler = ({
        added,
        updated,
        removed,
      }: {
        added: number[];
        updated: number[];
        removed: number[];
      }) => {
        const changedClients = added.concat(updated).concat(removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
        );
        const msg = encoding.toUint8Array(encoder);
        broadcast(msg, docName, ws);
      };
      awareness.on("update", awarenessHandler);

      // Send sync step 1 to new client
      {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.writeSyncStep1(encoder, ydoc);
        ws.send(encoding.toUint8Array(encoder));
      }

      // Send current awareness states to new client
      {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(
            awareness,
            Array.from(awareness.getStates().keys())
          )
        );
        ws.send(encoding.toUint8Array(encoder));
      }

      ws.on("message", (message: Buffer) => {
        const data = new Uint8Array(
          message.buffer,
          message.byteOffset,
          message.length
        );
        handleMessage(data, docName, ydoc, awareness, ws, readOnly);
      });

      ws.on("close", async () => {
        conns.delete(ws);
        ydoc.off("update", updateHandler);
        awareness.off("update", awarenessHandler);

        const docClients = docConns.get(docName);
        if (docClients) {
          docClients.delete(ws);
          if (docClients.size === 0) {
            // Last client left — persist and cleanup
            await saveYDoc(docName);
            // Someone may have reconnected while we were saving
            if (docClients.size > 0) return;
            clearYDoc(docName);
            docConns.delete(docName);
            docAwareness.delete(docName);
            // Refresh the AI search index with the saved content
            scheduleIndexDocument(docName);
          }
        }
      });

      ws.on("error", () => ws.close());
    }
  );
};