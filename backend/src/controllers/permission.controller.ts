import { Request, Response } from "express";
import { shareDocumentService, getDocumentPermissions, setLinkAccessService } from "../services/permission.service";

export const shareDocument = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        const { email, role } = req.body;

        const ownerId = (req as any).user.id;

        const document = await shareDocumentService(id, ownerId, email, role);

        return res.status(200).json({
            success: true,
            message: "Document shared successfully",
            document,
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

        const { linkAccess, permissions } = await getDocumentPermissions(id, ownerId);

        return res.status(200).json({
            success: true,
            linkAccess,
            permissions,
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