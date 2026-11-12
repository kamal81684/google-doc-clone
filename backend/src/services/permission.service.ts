import prisma from "../config/prisma";
import { LinkAccess, PermissionRole } from "@prisma/client";
import { isMailEnabled } from "../config/mailer";
import { sendShareNotification } from "./mail.service";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const shareDocumentService = async (
    documentId: string,
    ownerId: string,
    rawEmail: string,
    role: string,
    options: { notify?: boolean; message?: string | undefined } = {}
) => {
    const email = String(rawEmail ?? "").trim().toLowerCase();

    if (!EMAIL_PATTERN.test(email)) {
        throw new Error("Enter a valid email address");
    }

    if (!Object.values(PermissionRole).includes(role as PermissionRole)) {
        throw new Error("Invalid role. Must be VIEWER or EDITOR");
    }

    const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { owner: { select: { name: true, email: true } } },
    });

    if (!document) {
        throw new Error("Document not found");
    }

    if (document.ownerId !== ownerId) {
        throw new Error("You are not the owner of this document");
    }

    const userToShare = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
    });

    if (userToShare?.id === ownerId) {
        throw new Error("You cannot share document with yourself");
    }

    // No account yet: keep a pending invite (claimed when they sign up) and email them to join
    if (!userToShare) {
        const existingInvite = await prisma.documentInvite.findUnique({
            where: { documentId_email: { documentId, email } },
            select: { role: true },
        });

        const invite = await prisma.documentInvite.upsert({
            where: { documentId_email: { documentId, email } },
            update: { role: role as PermissionRole },
            create: { documentId, email, role: role as PermissionRole },
        });

        // Unlike existing users, an invitee only learns about the doc from this email,
        // so it goes out even with "Notify people" off (as in Google Docs)
        const notified =
            existingInvite?.role !== invite.role &&
            (await notify({
                to: email,
                document,
                role: invite.role,
                message: options.message,
                invite: true,
            }));

        return { permission: null, invite, invited: true, notified };
    }

    const existing = await prisma.documentPermission.findUnique({
        where: { documentId_userId: { documentId, userId: userToShare.id } },
        select: { role: true },
    });

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

    // Like Google Docs: email only when access is new or the role changed, never re-send for a no-op
    const notified =
        options.notify !== false &&
        existing?.role !== permission.role &&
        (await notify({
            to: userToShare.email,
            document,
            role: permission.role,
            message: options.message,
            invite: false,
        }));

    return { permission, invite: null, invited: false, notified };
};

const notify = async ({
    to,
    document,
    role,
    message,
    invite,
}: {
    to: string;
    document: { id: string; title: string; owner: { name: string; email: string } };
    role: PermissionRole;
    message: string | undefined;
    invite: boolean;
}) => {
    if (!isMailEnabled()) return false;
    try {
        return await sendShareNotification({
            to,
            sharerName: document.owner.name,
            sharerEmail: document.owner.email,
            documentId: document.id,
            documentTitle: document.title,
            role,
            message: message?.slice(0, 2000),
            invite,
        });
    } catch (error) {
        // The share itself succeeded; a mail failure shouldn't undo it
        console.error("Share notification email failed:", error);
        return false;
    }
};

/**
 * Turns pending invites for this email into real permissions. Called after sign-up and
 * Google sign-in, so docs shared before the account existed show up in "Shared with me".
 */
const claimDocumentInvites = async (userId: string, email: string) => {
    const invites = await prisma.documentInvite.findMany({
        where: { email: email.trim().toLowerCase() },
        include: { document: { select: { ownerId: true } } },
    });
    if (invites.length === 0) return 0;

    await prisma.$transaction([
        prisma.documentPermission.createMany({
            data: invites
                .filter((invite) => invite.document.ownerId !== userId)
                .map((invite) => ({ documentId: invite.documentId, userId, role: invite.role })),
            skipDuplicates: true,
        }),
        prisma.documentInvite.deleteMany({ where: { id: { in: invites.map((i) => i.id) } } }),
    ]);
    return invites.length;
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

    const invites = await prisma.documentInvite.findMany({
        where: { documentId },
        orderBy: { createdAt: "asc" },
        select: { email: true, role: true },
    });

    return {
        linkAccess: document.linkAccess,
        pendingInvites: invites,
        permissions: permissions.map((p) => ({
            userId: p.user.id,
            name: p.user.name,
            email: p.user.email,
            role: p.role,
        })),
    };
};

export { shareDocumentService, claimDocumentInvites, checkDocumentAccess, getDocumentPermissions, setLinkAccessService };
