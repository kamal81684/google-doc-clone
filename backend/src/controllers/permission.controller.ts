import { Request, Response } from "express";
import { isMailEnabled } from "../config/mailer";
import { shareDocumentService, getDocumentPermissions, setLinkAccessService } from "../services/permission.service";

export const shareDocument = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        const { email, role, notify, message } = req.body;

        const ownerId = (req as any).user.id;

        const { permission, invited, notified } = await shareDocumentService(id, ownerId, email, role, {
            notify: notify !== false,
            message: typeof message === "string" ? message : undefined,
        });

        return res.status(200).json({
            success: true,
            message: invited ? "Invitation sent" : "Document shared successfully",
            document: permission,
            invited,
            notified,
        });

    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const getSharedUsers = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;
        const ownerId = (req as any).user.id;

        const { linkAccess, permissions, pendingInvites } = await getDocumentPermissions(id, ownerId);

        return res.status(200).json({
            success: true,
            linkAccess,
            permissions,
            pendingInvites,
            // Lets the share dialog show the "Notify people" option only when email can be sent
            notificationsEnabled: isMailEnabled(),
        });

    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const setLinkAccess = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;
        const ownerId = (req as any).user.id;

        const linkAccess = await setLinkAccessService(id, ownerId, req.body.linkAccess);

        return res.status(200).json({
            success: true,
            linkAccess,
        });

    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export default { shareDocument, getSharedUsers, setLinkAccess };