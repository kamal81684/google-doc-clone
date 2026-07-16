import { Request, Response } from "express";
import {
    loginUser,
    registerUser,
} from "../services/auth.services";
import { generateToken } from "../utils/generateToken";

export const register = async (
    req: Request,
    res: Response
) => {

    try {

        const { name, email, password } = req.body;

        const user = await registerUser(
            name,
            email,
            password
        );

        res.status(201).json({
            success: true,
            message: "User Registered Successfully",
            user,
        });

    } catch (error: any) {

        res.status(400).json({
            success: false,
            message: error.message,
        });

    }

};

export const login = async (
    req: Request,
    res: Response
) => {

    try {

        const { email, password } = req.body;

        const user = await loginUser(
            email,
            password
        );

        const token = generateToken(user.id);

        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            success: true,
            user,
        });

    } catch (error: any) {

        res.status(400).json({
            success: false,
            message: error.message,
        });

    }

};

export const logout = async (
    req: Request,
    res: Response
) => {

    res.cookie("token", "", {
        maxAge: 0,
    });

    res.json({
        success: true,
        message: "Logged Out",
    });

};