import crypto from "crypto";
import prisma from "../config/prisma";
import { AuthError } from "../utils/authError";
import { sendVerificationCodeEmail } from "./mail.service";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

// Codes are stored as an HMAC so a database leak doesn't expose live codes
const hashCode = (userId: string, code: string) =>
    crypto
        .createHmac("sha256", process.env.JWT_SECRET as string)
        .update(`${userId}:${code}`)
        .digest("hex");

/**
 * Emails a fresh 6-digit code, unless one was sent in the last minute (then the earlier code
 * still works). Returns seconds until another can be sent.
 */
const sendVerificationCode = async (user: { id: string; name: string; email: string }) => {
    const existing = await prisma.emailVerification.findUnique({ where: { userId: user.id } });
    if (existing) {
        const waitMs = existing.sentAt.getTime() + RESEND_COOLDOWN_MS - Date.now();
        if (waitMs > 0 && existing.expiresAt.getTime() > Date.now()) {
            return { sent: false, retryAfter: Math.ceil(waitMs / 1000) };
        }
    }

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const data = {
        codeHash: hashCode(user.id, code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
        attempts: 0,
        sentAt: new Date(),
    };
    await prisma.emailVerification.upsert({
        where: { userId: user.id },
        update: data,
        create: { userId: user.id, ...data },
    });

    await sendVerificationCodeEmail({
        to: user.email,
        name: user.name,
        code,
        expiresInMinutes: CODE_TTL_MS / 60000,
    });
    return { sent: true, retryAfter: RESEND_COOLDOWN_MS / 1000 };
};

/** Checks the code and marks the account verified. Returns the user on success. */
const verifyEmailCode = async (rawEmail: string, rawCode: string) => {
    const email = String(rawEmail ?? "").trim();
    const code = String(rawCode ?? "").trim();

    const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        include: { emailVerification: true },
    });

    if (!user) throw new AuthError("Invalid or expired code");
    if (user.emailVerified) {
        throw new AuthError("This email is already verified. Please sign in.", 409, "ALREADY_VERIFIED");
    }

    const record = user.emailVerification;
    if (!record || record.expiresAt.getTime() < Date.now()) {
        throw new AuthError("This code has expired. Request a new one.", 400, "CODE_EXPIRED");
    }
    if (record.attempts >= MAX_ATTEMPTS) {
        throw new AuthError("Too many wrong attempts. Request a new code.", 429, "TOO_MANY_ATTEMPTS");
    }

    const expected = Buffer.from(record.codeHash, "hex");
    const actual = Buffer.from(hashCode(user.id, code), "hex");
    if (!/^\d{6}$/.test(code) || !crypto.timingSafeEqual(expected, actual)) {
        await prisma.emailVerification.update({
            where: { userId: user.id },
            data: { attempts: { increment: 1 } },
        });
        const left = MAX_ATTEMPTS - record.attempts - 1;
        throw new AuthError(
            left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many wrong attempts. Request a new code.",
            400,
            left > 0 ? "INVALID_CODE" : "TOO_MANY_ATTEMPTS"
        );
    }

    const [verified] = await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } }),
        prisma.emailVerification.delete({ where: { userId: user.id } }),
    ]);
    return verified;
};

export { sendVerificationCode, verifyEmailCode };
