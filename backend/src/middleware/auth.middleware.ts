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

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        );

        (req as any).user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });

    }
};

/**
 * Like isAuthenticated, but lets visitors without a valid session through (req.user unset),
 * for routes that link sharing opens up to anyone.
 */
export const optionalAuth = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    const token = req.cookies.token;

    if (token) {
        try {
            (req as any).user = jwt.verify(token, process.env.JWT_SECRET as string);
        } catch {
            // Expired or invalid session: continue as an anonymous visitor
        }
    }

    next();
};
