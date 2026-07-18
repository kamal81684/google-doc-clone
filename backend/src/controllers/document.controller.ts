import { Request, Response } from "express";
import { createDocumentService, getDocumentByIdService, getDocumentsByOwnerService, getUserDocumentsService, updateDocumentService } from "../services/document.service";
import PDFDocument from "pdfkit";
import { extractTextFromTiptap } from "../utils/documentExport";

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

        const id = req.params.id as string;
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

export const downloadDocumentAsTxt = async (
    req: Request,
    res: Response
) => {
    console.log("downloadDocumentAsTxt called");
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

        const text = extractTextFromTiptap(
            document.content
        );

        const fileContent = `${document.title}\n\n${text}`;

        const safeTitle = document.title.replace(
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

        const text = extractTextFromTiptap(
            document.content
        );

        const safeTitle = document.title.replace(
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
            .text(document.title);

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