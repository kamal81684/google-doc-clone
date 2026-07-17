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

export const getDocumentsByOwnerService = async (ownerId: string) => {
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
    const existingDocument = await prisma.document.findFirst({
        where: {
            id: documentId,
            ownerId: userId,
        }
    });

    if(!existingDocument) {
        throw new Error("Document not found or you do not have permission to update it.");
    }

    const document = await prisma.document.update({
        where: {
            id: documentId,
        },
        data: {
            ...(title !== undefined ? { title } : {}),
            ...(content !== undefined ? { content } : {}),
        },
    });

    return document;
};