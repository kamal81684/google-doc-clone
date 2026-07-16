import bcrypt from "bcrypt";
import prisma from "../config/prisma";

export const registerUser = async (
    name: string,
    email: string,
    password: string
) => {

    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
        },
    });

    return user;
};

export const loginUser = async (
    email: string,
    password: string
) => {

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user)
        throw new Error("Invalid Credentials");

    const isMatch = await bcrypt.compare(
        password,
        user.password
    );

    if (!isMatch)
        throw new Error("Invalid Credentials");

    return user;
};
