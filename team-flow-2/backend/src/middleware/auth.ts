import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db/index";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    departmentId?: string | null;
    hierarchyLevel?: number;
    permissions?: Record<string, boolean>;
  };
  io?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as any;

    if (decoded.id?.startsWith("portal_")) {
      req.user = {
        id: decoded.id, email: decoded.email || "", role: decoded.role || "MEMBER",
        departmentId: null, hierarchyLevel: decoded.hierarchyLevel || 1,
        permissions: decoded.permissions || {},
      };
      return next();
    }

    const user = await prisma.user.findUnique({ id: decoded.id });
    if (!user) return res.status(401).json({ error: "User not found" });
    let perms: Record<string, boolean> = {};
    try { perms = JSON.parse(user.permissions || "{}"); } catch {}
    req.user = {
      id: user.id, email: user.email, role: user.role, departmentId: user.departmentId,
      hierarchyLevel: user.hierarchyLevel || 1, permissions: perms,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};

export const requirePermission = (perm: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.permissions?.[perm]) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};

export const requireLevel = (minLevel: number) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || (req.user.hierarchyLevel || 1) < minLevel) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};
