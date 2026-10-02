import {Router} from "express";
import {createDocument, deleteDocument, getDocumentById, getDocuments, getUserDocuments, getSharedWithMe, updateDocument} from "../controllers/document.controller";
import {isAuthenticated} from "../middleware/auth.middleware";
import {
    downloadDocumentAsTxt,
    downloadDocumentAsPdf,
} from "../controllers/document.controller";
import {shareDocument, getSharedUsers} from "../controllers/permission.controller";
import {moveDocumentToFolder} from "../controllers/folder.controller";


const router = Router();

router.get("/", isAuthenticated, getDocuments);
router.post("/", isAuthenticated, createDocument);
router.get("/user", isAuthenticated, getUserDocuments);

router.get("/shared", isAuthenticated, getSharedWithMe);

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

router.post(
    "/:id/share",
    isAuthenticated,
    shareDocument
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

router.get("/:id", isAuthenticated, getDocumentById);
router.patch("/:id", isAuthenticated, updateDocument);
router.delete("/:id", isAuthenticated, deleteDocument);

export default router;
