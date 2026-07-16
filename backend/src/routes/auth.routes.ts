import { Router } from "express";

const router = Router();

router.post("/register", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "User registered successfully"
    })
});

export default router;
