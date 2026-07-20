import prisma from "../config/prisma";
import { PermissionRole } from "@prisma/client";

const shareDocumentService = async (
    documentId: string,
    ownerId: string,
    email: string,
    role: string
) => {
    const document = await prisma.document.findUnique({
        where: { id: documentId },
    });

    if (!document) {
        throw new Error("Document not found");
    }

    if (document.ownerId !== ownerId) {
        throw new Error("You are not the owner of this document");
    }

    const userToShare = await prisma.user.findUnique({
        where: { email },
    });

    if (!userToShare) {
        throw new Error("User not found with this email");
    }

    if (userToShare.id === ownerId) {
        throw new Error("You cannot share document with yourself");
    }

    if (!Object.values(PermissionRole).includes(role as PermissionRole)) {
        throw new Error("Invalid role. Must be VIEWER or EDITOR");
    }

    const permission = await prisma.documentPermission.upsert({
        where: {
            documentId_userId: {
                documentId,
                userId: userToShare.id,
            },
        },
        update: {
            role: role as PermissionRole,
        },
        create: {
            documentId,
            userId: userToShare.id,
            role: role as PermissionRole,
        },
    });

    return permission;
};

const checkDocumentAccess = async (
    documentId: string,
    userId: string
): Promise<"OWNER" | "EDITOR" | "VIEWER" | null> => {
    const document = await prisma.document.findUnique({
        where: { id: documentId },
    });

    if (!document) {
        return null;
    }

    if (document.ownerId === userId) {
        return "OWNER";
    }

    const permission = await prisma.documentPermission.findUnique({
        where: {
            documentId_userId: {
                documentId,
                userId,
            },
        },
    });

    return permission ? permission.role : null;
};

const getDocumentPermissions = async (
    documentId: string,
    ownerId: string
) => {
    const document = await prisma.document.findUnique({
        where: { id: documentId },
    });

    if (!document) {
        throw new Error("Document not found");
    }

    if (document.ownerId !== ownerId) {
        throw new Error("You are not the owner of this document");
    }

    const permissions = await prisma.documentPermission.findMany({
        where: { documentId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    return permissions.map((p) => ({
        userId: p.user.id,
        name: p.user.name,
        email: p.user.email,
        role: p.role,
    }));
};

export { shareDocumentService, checkDocumentAccess, getDocumentPermissions };
