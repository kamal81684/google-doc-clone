import { Request, Response } from "express";
import { createDocumentService, deleteDocumentService, getDocumentByIdService, getDocumentsByOwnerService, getUserDocumentsService, getSharedWithMeService, updateDocumentService } from "../services/document.service";
import PDFDocument from "pdfkit";
import { extractDocumentText } from "../utils/documentExport";
import { scheduleIndexDocument } from "../services/indexing.service";

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
        const id = req.params.id as string;

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

        const documents = await getDocumentsByOwnerService(userId, req.query.search as string | undefined);

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

export const getSharedWithMe = async (
    req: Request,
    res: Response
) => {
    try {
        const userId = (req as any).user.id;

        const documents = await getSharedWithMeService(userId);

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

        const id = req.params.id as string;
        const { title, content } = req.body;

        const document = await updateDocumentService(
            id,
            userId,
            title,
            content
        );

        if (title !== undefined) {
            scheduleIndexDocument(id);
        }

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

export const downloadDocumentAsTxt = async (
    req: Request,
    res: Response
) => {
    try {
        const userId = (req as any).user.id;
        const id = req.params.id as string;

        const document = await getDocumentByIdService(
            id,
            userId
        );

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        const text = extractDocumentText(
            document.content,
            document.ydocState as Buffer | null
        );

        const fileContent = `${document.title ?? "Untitled Document"}\n\n${text}`;

        const safeTitle = (document.title ?? "Untitled Document").replace(
            /[^a-zA-Z0-9-_ ]/g,
            ""
        );

        res.setHeader(
            "Content-Type",
            "text/plain; charset=utf-8"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${safeTitle || "document"}.txt"`
        );

        return res.send(fileContent);

    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const downloadDocumentAsPdf = async (
    req: Request,
    res: Response
) => {
    try {
        const userId = (req as any).user.id;
        const id = req.params.id as string;

        const document = await getDocumentByIdService(
            id,
            userId
        );

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        const text = extractDocumentText(
            document.content,
            document.ydocState as Buffer | null
        );

        const safeTitle = (document.title ?? "Untitled Document").replace(
            /[^a-zA-Z0-9-_ ]/g,
            ""
        );

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${safeTitle || "document"}.pdf"`
        );

        const pdf = new PDFDocument();

        // Stream PDF directly to HTTP response
        pdf.pipe(res);

        pdf
            .fontSize(20)
            .text(document.title ?? "Untitled Document");

        pdf.moveDown();

        pdf
            .fontSize(12)
            .text(text);

        pdf.end();

    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const deleteDocument = async (
    req: Request,
    res: Response
) => {
    try {
        const userId = (req as any).user.id;

        const id = req.params.id as string;

        const document = await deleteDocumentService(id, userId);

        return res.status(200).json({
            success: true,
            message: "Document deleted successfully",
            document,
        });

    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};