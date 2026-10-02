import * as Y from "yjs";

export const extractTextFromTiptap = (node: any): string => {
    if (!node) {
        return "";
    }

    // Actual text node
    if (node.type === "text") {
        return node.text || "";
    }

    if (!node.content) {
        return "";
    }

    const text = node.content
        .map((child: any) => extractTextFromTiptap(child))
        .join("");

    // Add new lines between block elements
    if (
        node.type === "paragraph" ||
        node.type === "heading" ||
        node.type === "listItem"
    ) {
        return text + "\n";
    }

    return text;
};

function xmlElementToText(element: Y.XmlElement | Y.XmlText): string {
    if (element instanceof Y.XmlText) {
        // toString() would wrap formatted runs in tags like <bold>; we want plain text
        return element
            .toDelta()
            .map((op: { insert?: unknown }) => (typeof op.insert === "string" ? op.insert : ""))
            .join("");
    }

    let text = "";
    element.forEach((child) => {
        text += xmlElementToText(child);
    });

    if (["paragraph", "heading", "listItem", "codeBlock"].includes(element.nodeName)) {
        text += "\n";
    }

    return text;
}

export const extractTextFromYDoc = (ydoc: Y.Doc): string => {
    const fragment = ydoc.getXmlFragment("tiptap");
    let text = "";
    fragment.forEach((child) => {
        text += xmlElementToText(child);
    });
    return text;
};

export const extractTextFromYDocState = (ydocState: Buffer): string => {
    const ydoc = new Y.Doc();
    try {
        Y.applyUpdate(ydoc, new Uint8Array(ydocState));
        return extractTextFromYDoc(ydoc);
    } finally {
        ydoc.destroy();
    }
};

/** Best-effort text extraction: prefer Yjs state, fall back to legacy TipTap JSON. */
export const extractDocumentText = (
    content: any,
    ydocState: Buffer | null
): string => {
    if (ydocState) {
        return extractTextFromYDocState(ydocState);
    }
    return extractTextFromTiptap(content);
};