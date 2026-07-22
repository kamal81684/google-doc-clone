"use client";

import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const COLORS = [
  "#30bced", "#6eeb83", "#ffbc42", "#ecd444",
  "#ee6352", "#9ac2c9", "#8acb88", "#1be7ff",
];

interface UseCollaborationOptions {
  documentId: string;
  userName: string;
}

export function useCollaboration({ documentId, userName }: UseCollaborationOptions) {
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [isSynced, setIsSynced] = useState(false);
  const userNameRef = useRef(userName);

  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  useEffect(() => {
    const doc = new Y.Doc();
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5000";

    const wsProvider = new WebsocketProvider(wsUrl, "ws", doc, {
      params: { doc: documentId },
      resyncInterval: 30000,
    });

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    wsProvider.awareness.setLocalState({
      user: {
        name: userNameRef.current,
        color: color,
      },
    });

    wsProvider.on("sync", (synced: boolean) => {
      setIsSynced(synced);
    });

    let isMounted = true;

    Promise.resolve().then(() => {
      if (!isMounted) return;
      setProvider(wsProvider);
      setDoc(doc);
    });

    return () => {
      isMounted = false;
      wsProvider.awareness.setLocalState(null);
      wsProvider.disconnect();
      wsProvider.destroy();
      doc.destroy();
    };
  }, [documentId]);

  useEffect(() => {
    if (provider) {
      provider.awareness.setLocalStateField("user", {
        name: userName,
        color: provider.awareness.getLocalState()?.user?.color || COLORS[0],
      });
    }
  }, [userName, provider]);

  return { provider, doc, isSynced };
}
