import { jwtVerify, SignJWT } from "jose";

export interface SessionPayload {
    userId: string;
    role: string;
}

const getJwtSecretKey = () => {
    const secret = process.env.JWT_SECRET || "super-secret-key-for-dev";
    return new TextEncoder().encode(secret);
};

export async function verifyAuth(token: string) {
    try {
        const verified = await jwtVerify(token, getJwtSecretKey());
        return verified.payload as unknown as SessionPayload;
    } catch (err) {
        return null;
    }
}

export async function signToken(payload: SessionPayload) {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(getJwtSecretKey());
}
