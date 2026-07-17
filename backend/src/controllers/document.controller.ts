import { Request, Response } from "express";
import { createDocumentService, getDocumentByIdService, getDocumentsByOwnerService, getUserDocumentsService, updateDocumentService } from "../services/document.service";

export const createDocument = async (
    req: Request,
    res: Response
) => {

    try {

        const userId = (req as any).user.id;

        const document = await createDocumentService(userId);

        return res.status(201).json({
            success: true,
            document
        });

    } catch (error: any) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

export const getDocumentById = async (
    req: Request,
    res: Response
) => {

    try {

        const userId = (req as any).user.id;
        const { id } = req.params;

        const document = await getDocumentByIdService(id, userId);

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found"
            });
        }

        return res.status(200).json({
            success: true,
            document
        });

    } catch (error: any) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

export const getDocuments = async (
    req: Request,
    res: Response
) => {

    try {

        const userId = (req as any).user.id;

        const documents = await getDocumentsByOwnerService(userId);

        return res.status(200).json({
            success: true,
            documents
        });

    } catch (error: any) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

export const getUserDocuments = async (
    req: Request,
    res: Response
) => {
    try {
        const userId = (req as any).user.id;

        const documents = await getUserDocumentsService(userId);

        return res.status(200).json({
            success: true,
            documents,
        });

    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const updateDocument = async (
    req: Request,
    res: Response
) => {
    try {
        const userId = (req as any).user.id;

        const  {id } = req.params;
        const { title, content } = req.body;

        const document = await updateDocumentService(
            id,
            userId,
            title,
            content
        );

        return res.status(200).json({
            success: true,
            message: "Document updated successfully",
            document,
        });

    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};