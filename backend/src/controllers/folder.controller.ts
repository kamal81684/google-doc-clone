import { Request, Response } from "express";
import {
    createFolderService,
    deleteFolderService,
    getFoldersService,
    moveDocumentToFolderService,
    renameFolderService,
} from "../services/folder.service";

export const getFolders = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const folders = await getFoldersService(userId);

        return res.status(200).json({
            success: true,
            folders,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const createFolder = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const folder = await createFolderService(userId, req.body?.name);

        return res.status(201).json({
            success: true,
            folder,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const renameFolder = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const id = req.params.id as string;

        const folder = await renameFolderService(id, userId, req.body?.name);

        return res.status(200).json({
            success: true,
            folder,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const deleteFolder = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const id = req.params.id as string;

        await deleteFolderService(id, userId);

        return res.status(200).json({
            success: true,
            message: "Folder deleted",
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const moveDocumentToFolder = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const id = req.params.id as string;
        const folderId = req.body?.folderId;

        if (folderId !== null && typeof folderId !== "string") {
            return res.status(400).json({
                success: false,
                message: "folderId must be a folder id or null",
            });
        }

        const result = await moveDocumentToFolderService(id, userId, folderId);

        return res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
