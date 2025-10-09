import JWT, { JwtPayload } from "jsonwebtoken";

export const decodeToken = (token: string): JwtPayload => {
  const decoded = JWT.decode(token) as JwtPayload;
  if (!decoded) {
    throw new Error("Invalid token");
  }
  return decoded;
}

export const verifyToken = (token: string, publicKey: string) => {
  try {
    return JWT.verify(token, publicKey, { algorithms: ["RS256"] });
  } catch (error) {
    throw new Error("Invalid token");
  }
};
