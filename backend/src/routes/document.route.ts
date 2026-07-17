import {Router} from "express";
import {createDocument, getDocumentById, getDocuments, getUserDocuments, updateDocument} from "../controllers/document.controller";
import {isAuthenticated} from "../middleware/auth.middleware";


const router = Router();

router.get("/", isAuthenticated, getDocuments);
router.post("/", isAuthenticated, createDocument);
router.get("/user", isAuthenticated, getUserDocuments);
router.get("/:id", isAuthenticated, getDocumentById);
router.patch("/:id", isAuthenticated, updateDocument);

export default router;
