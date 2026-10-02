import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import { checkDocumentAccess } from "./permission.service";

export const createDocumentService = async (ownerId: string) => {
    const document = await prisma.document.create({
        data: {
            ownerId,
            title: "Untitled Document",
            content: Prisma.JsonNull,
        },
    });
    return document;
};

/** No access to a document: 401 asks an anonymous visitor to sign in, 403 means signed in but not shared. */
export class DocumentAccessError extends Error {
    constructor(message: string, public status: 401 | 403) {
        super(message);
    }
}

/** userId is null for visitors who aren't signed in (link sharing). */
export const getDocumentByIdService = async (documentId: string, userId: string | null) => {
    const access = await checkDocumentAccess(documentId, userId);

    if (!access) {
        throw userId
            ? new DocumentAccessError("You don't have access to this document", 403)
            : new DocumentAccessError("Sign in to open this document", 401);
    }

    const document = await prisma.document.findUnique({
        where: { id: documentId },
    });

    return {
        ...document,
        accessRole: access,
    };
};

export const getDocumentsByOwnerService = async (ownerId: string, search?: string) => {
    const documents = await prisma.document.findMany({
        where: {
            ownerId,
            ...(search
                ? { title: { contains: search, mode: "insensitive" as const } }
                : {}),
        },
        orderBy: {
            updatedAt: "desc",
        },
    });
    return documents;
};

export const getUserDocumentsService = async (
    ownerId: string
) => {
    const documents = await prisma.document.findMany({
        where: {
            ownerId,
        },
        orderBy: {
            updatedAt: "desc",
        },
    });

    return documents;
};

export const getSharedWithMeService = async (userId: string) => {
    const permissions = await prisma.documentPermission.findMany({
        where: {
            userId,
        },
        include: {
            document: true,
        },
        orderBy: {
            document: {
                updatedAt: "desc",
            },
        },
    });

    return permissions.map((p) => ({
        ...p.document,
        accessRole: p.role,
    }));
};

export const updateDocumentService = async(
    documentId: string,
    userId: string | null,
    title?: string,
    content?: any   // keep param for backward compat but stop using it for content
) => {
    try {
        const access = await checkDocumentAccess(documentId, userId);

        if (!access || access === "VIEWER") {
            throw new Error("You do not have permission to update this document");
        }

        if (title !== undefined) {
            // Titles are unique per owner, whoever (editor, link visitor) is renaming it
            const current = await prisma.document.findUnique({
                where: { id: documentId },
                select: { ownerId: true },
            });
            const existing = await prisma.document.findFirst({
                where: {
                    ownerId: current?.ownerId ?? "",
                    title,
                    id: { not: documentId },
                },
            });

            if (existing) {
                throw new Error("A document with this name already exists");
            }
        }

        const document = await prisma.document.update({
            where: {
                id: documentId,
            },
            data: {
                ...(title !== undefined ? { title } : {}),
                // REMOVE content from here — Yjs manages content now
            },
        });

        return document;
    } catch (error: any) {
        if (error.code === "P2025") {
            throw new Error("Document not found or you do not have permission to update it.");
        }
        throw error;
    }
};

export const deleteDocumentService = async(
    documentId: string,
    userId: string,
) => {
    try {
        const document = await prisma.document.delete({
            where: {
                id: documentId,
                ownerId: userId,
            },
        });

        return document;
    } catch (error: any) {
        if (error.code === "P2025") {
            throw new Error("Document not found");
        }
        throw error;
    }
};