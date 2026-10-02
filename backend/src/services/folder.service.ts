import prisma from "../config/prisma";

const normalizeName = (name: unknown) => {
    if (typeof name !== "string" || !name.trim()) {
        throw new Error("Folder name is required");
    }
    return name.trim().slice(0, 60);
};

const assertFolderOwner = async (folderId: string, userId: string) => {
    const folder = await prisma.folder.findFirst({
        where: { id: folderId, ownerId: userId },
    });
    if (!folder) {
        throw new Error("Folder not found");
    }
    return folder;
};

export const getFoldersService = async (userId: string) => {
    const folders = await prisma.folder.findMany({
        where: { ownerId: userId },
        include: { _count: { select: { documents: true } } },
        orderBy: { name: "asc" },
    });

    return folders.map(({ _count, ...folder }) => ({
        ...folder,
        documentCount: _count.documents,
    }));
};

export const createFolderService = async (userId: string, name: unknown) => {
    const folderName = normalizeName(name);

    const existing = await prisma.folder.findUnique({
        where: { ownerId_name: { ownerId: userId, name: folderName } },
    });
    if (existing) {
        throw new Error("A folder with this name already exists");
    }

    return prisma.folder.create({
        data: { ownerId: userId, name: folderName },
    });
};

export const renameFolderService = async (
    folderId: string,
    userId: string,
    name: unknown
) => {
    const folderName = normalizeName(name);
    await assertFolderOwner(folderId, userId);

    const clash = await prisma.folder.findFirst({
        where: { ownerId: userId, name: folderName, id: { not: folderId } },
    });
    if (clash) {
        throw new Error("A folder with this name already exists");
    }

    return prisma.folder.update({
        where: { id: folderId },
        data: { name: folderName },
    });
};

/** Deletes the folder only; its documents become unfiled. */
export const deleteFolderService = async (folderId: string, userId: string) => {
    await assertFolderOwner(folderId, userId);
    return prisma.folder.delete({ where: { id: folderId } });
};

export const moveDocumentToFolderService = async (
    documentId: string,
    userId: string,
    folderId: string | null
) => {
    if (folderId !== null) {
        await assertFolderOwner(folderId, userId);
    }

    // Raw SQL so moving a document doesn't bump its "last edited" time
    const updated = await prisma.$executeRaw`
        UPDATE "Document" SET "folderId" = ${folderId}
        WHERE "id" = ${documentId} AND "ownerId" = ${userId}`;

    if (updated === 0) {
        throw new Error("Only the owner can move this document");
    }

    return { documentId, folderId };
};
