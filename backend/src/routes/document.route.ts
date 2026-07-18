import {Router} from "express";
import {createDocument, getDocumentById, getDocuments, getUserDocuments, updateDocument} from "../controllers/document.controller";
import {isAuthenticated} from "../middleware/auth.middleware";
import {
    downloadDocumentAsTxt,
    downloadDocumentAsPdf,
} from "../controllers/document.controller";


const router = Router();

router.get("/", isAuthenticated, getDocuments);
router.post("/", isAuthenticated, createDocument);
router.get("/user", isAuthenticated, getUserDocuments);

// Put these BEFORE "/:id"
router.get(
    "/:id/download/txt",
    isAuthenticated,
    downloadDocumentAsTxt
);

router.get(
    "/:id/download/pdf",
    isAuthenticated,
    downloadDocumentAsPdf
);

router.get("/:id", isAuthenticated, getDocumentById);
router.patch("/:id", isAuthenticated, updateDocument);

export default router;
