import * as Y from "yjs";
import prisma from "./prisma";

const docs = new Map<string, Y.Doc>();

export const getYDoc = async (docName: string): Promise<Y.Doc> => {
    if (docs.has(docName)) {
        return docs.get(docName)!;
    }

    const ydoc = new Y.Doc();
    docs.set(docName, ydoc);


    const document = await prisma.document.findFirst({
        where: {id: docName},
        select: {ydocState: true}
    });

    if(document?.ydocState) {
        Y.applyUpdate(ydoc, new Uint8Array(document.ydocState));
    }

    return ydoc;
};

/** The in-memory doc while someone has it open (it is newer than the DB copy). */
export const getLoadedYDoc = (docName: string): Y.Doc | undefined => docs.get(docName);

export const saveYDoc = async (docName: string): Promise<void> => {
    const ydoc = docs.get(docName);
    if(!ydoc) return;

    const state = Y.encodeStateAsUpdate(ydoc);

    await prisma.document.update({
        where: { id: docName },
        data: { ydocState: Buffer.from(state) },
    });
};

export const clearYDoc = (docName: string): void => {
  const ydoc = docs.get(docName);
  if (ydoc) {
    ydoc.destroy();
    docs.delete(docName);
  }
};
