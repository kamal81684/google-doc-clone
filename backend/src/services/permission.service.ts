import prisma from "../config/prisma";
import { LinkAccess, PermissionRole } from "@prisma/client";

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

export type AccessRole = "OWNER" | "EDITOR" | "VIEWER";

const ROLE_RANK: Record<AccessRole, number> = { VIEWER: 1, EDITOR: 2, OWNER: 3 };

/**
 * The caller's role on a document, or null for no access. userId is null for visitors who
 * aren't signed in; they only get in through the document's link access.
 */
const checkDocumentAccess = async (
    documentId: string,
    userId: string | null
): Promise<AccessRole | null> => {
    const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: { ownerId: true, linkAccess: true },
    });

    if (!document) {
        return null;
    }

    if (userId && document.ownerId === userId) {
        return "OWNER";
    }

    const permission = userId
        ? await prisma.documentPermission.findUnique({
              where: {
                  documentId_userId: {
                      documentId,
                      userId,
                  },
              },
          })
        : null;

    const linkRole = document.linkAccess === LinkAccess.RESTRICTED ? null : document.linkAccess;

    // The stronger of a direct share and the link's role
    const roles = [permission?.role, linkRole].filter(Boolean) as AccessRole[];
    if (roles.length === 0) return null;
    return roles.reduce((best, role) => (ROLE_RANK[role] > ROLE_RANK[best] ? role : best));
};

const setLinkAccessService = async (
    documentId: string,
    ownerId: string,
    linkAccess: string
) => {
    if (!Object.values(LinkAccess).includes(linkAccess as LinkAccess)) {
        throw new Error("Invalid link access. Must be RESTRICTED, VIEWER or EDITOR");
    }

    const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: { ownerId: true },
    });

    if (!document) {
        throw new Error("Document not found");
    }

    if (document.ownerId !== ownerId) {
        throw new Error("You are not the owner of this document");
    }

    const updated = await prisma.document.update({
        where: { id: documentId },
        data: { linkAccess: linkAccess as LinkAccess },
        select: { linkAccess: true },
    });

    return updated.linkAccess;
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

    return {
        linkAccess: document.linkAccess,
        permissions: permissions.map((p) => ({
            userId: p.user.id,
            name: p.user.name,
            email: p.user.email,
            role: p.role,
        })),
    };
};

export { shareDocumentService, checkDocumentAccess, getDocumentPermissions, setLinkAccessService };
