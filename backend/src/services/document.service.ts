import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";

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

export const getDocumentByIdService = async (documentId: string, ownerId: string) => {
    const document = await prisma.document.findFirst({
        where: {
            id: documentId,
            ownerId,
        },
    });
    return document;
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

export const updateDocumentService = async(
    documentId: string,
    userId: string,
    title?: string,
    content?: any
) => {
    try {
        if (title !== undefined) {
            const existing = await prisma.document.findFirst({
                where: {
                    ownerId: userId,
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
                ownerId: userId,
            },
            data: {
                ...(title !== undefined ? { title } : {}),
                ...(content !== undefined ? { content } : {}),
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