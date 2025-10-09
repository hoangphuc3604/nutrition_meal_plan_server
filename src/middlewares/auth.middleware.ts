import { Request, Response, NextFunction } from "express";
import { decodeToken, verifyToken } from "../utils/auth.util";
import Database from "../config/database";
import { KeyToken } from "../models";

const getKeyTokenByUserId = async (userId: string) => {
  try {
    const keyTokenRepo = Database.getRepository(KeyToken);
    const keyPair = await keyTokenRepo.findOne({ where: { user: { id: userId } } });
    return keyPair;
  } catch (error) {
    console.error("Error fetching key token:", error);
    return null;
  }
};

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers["authorization"];
    
    if (!authHeader) {
      return res.status(401).json({ 
        status: 'error',
        message: "No token provided" 
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ 
        status: 'error',
        message: "Invalid token format" 
      });
    }

    // Decode token to get userId
    const decoded = decodeToken(token);
    const userId = decoded.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        status: 'error',
        message: "Invalid token payload" 
      });
    }

    // Get public key from database
    const keyPair = await getKeyTokenByUserId(userId);
    if (!keyPair) {
      return res.status(401).json({ 
        status: 'error',
        message: "Key not found" 
      });
    }

    // Verify token
    const payload = verifyToken(token, keyPair.publicKey);
    if (!payload) {
      return res.status(401).json({ 
        status: 'error',
        message: "Token verification failed" 
      });
    }

    // Attach user to request
    (req as any).user = payload;

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({
      status: 'error',
      message: (err as Error).message || "Unauthorized"
    });
  }
};
