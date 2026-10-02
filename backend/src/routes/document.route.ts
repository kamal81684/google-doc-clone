import {Router} from "express";
import {createDocument, deleteDocument, getDocumentById, getDocuments, getUserDocuments, getSharedWithMe, updateDocument} from "../controllers/document.controller";
import {isAuthenticated, optionalAuth} from "../middleware/auth.middleware";
import {
    downloadDocumentAsTxt,
    downloadDocumentAsPdf,
} from "../controllers/document.controller";
import {shareDocument, getSharedUsers, setLinkAccess} from "../controllers/permission.controller";
import {moveDocumentToFolder} from "../controllers/folder.controller";


const router = Router();

router.get("/", isAuthenticated, getDocuments);
router.post("/", isAuthenticated, createDocument);
router.get("/user", isAuthenticated, getUserDocuments);

router.get("/shared", isAuthenticated, getSharedWithMe);

// Put these BEFORE "/:id"
router.get(
    "/:id/download/txt",
    optionalAuth,
    downloadDocumentAsTxt
);

router.get(
    "/:id/download/pdf",
    optionalAuth,
    downloadDocumentAsPdf
);

router.post(
    "/:id/share",
    isAuthenticated,
    shareDocument
);

router.patch(
    "/:id/link-access",
    isAuthenticated,
    setLinkAccess
);

router.get(
    "/:id/permissions",
    isAuthenticated,
    getSharedUsers
);

router.patch(
    "/:id/folder",
    isAuthenticated,
    moveDocumentToFolder
);

// Open to anyone with the link when the document allows it; access is checked per document
router.get("/:id", optionalAuth, getDocumentById);
router.patch("/:id", optionalAuth, updateDocument);
router.delete("/:id", isAuthenticated, deleteDocument);

export default router;
