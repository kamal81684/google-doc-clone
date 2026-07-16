import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export const isAuthenticated = (
    req: Request,
    res: Response,
    next: NextFunction
) => {

    const token = req.cookies.token;

    if (!token) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });

    }

    const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string
    );

    (req as any).user = decoded;

    next();
};