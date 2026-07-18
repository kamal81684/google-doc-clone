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