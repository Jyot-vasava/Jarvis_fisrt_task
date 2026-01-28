import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserModel } from "../Model/user.Model.js";
import { Role } from "../Model/role.Model.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

interface JwtPayload {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      roleId?: string | any;
    }
    interface Request {
      user?: User;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        message: "No token provided"
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const user = await UserModel.findOne({ 
      _id: decoded.id, 
      isDeleted: false 
    })
      .populate({
        path: 'roleId',
        select: 'roleName status permissions',
        populate: {
          path: 'permissions',
          select: 'moduleName action'
        }
      })
      .select("-password");

    if (!user) {
      res.status(401).json({
        message: "User not found or deleted"
      });
      return;
    }

    if (user.status !== "Active") {
      res.status(403).json({
        message: "User account is inactive"
      });
      return;
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      roleId: user.roleId
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};

const getUserPermissions = (roleId: Role): string[] => {
  const permissions: string[] = [];
  
  if (roleId && roleId.status === "Active" && roleId.permissions && Array.isArray(roleId.permissions)) {
    roleId.permissions.forEach((perm: any) => {
      // Format: ModuleName_action (e.g., "Users_create", "Users_list")
      permissions.push(`${perm.moduleName}_${perm.action}`);
    });
  }
  
  return [...new Set(permissions)];
};

export const requirePermission = (moduleName: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({
          message: "Unauthorized"
        });
        return;
      }

      const user = await UserModel.findOne({ 
        _id: req.user.id, 
        isDeleted: false 
      }).populate({
        path: 'roleId',
        populate: { path: 'permissions', select: 'moduleName action' }
      });

      if (!user) {
        res.status(404).json({
          message: "User not found"
        });
        return;
      }

      const userPermissions = getUserPermissions(user.roleId);
      const requiredPermission = `${moduleName}_${action}`;

      if (!userPermissions.includes(requiredPermission)) {
        res.status(403).json({
          message: `Access denied. Required permission: ${moduleName} - ${action}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({
        message: "Permission check failed"
      });
    }
  };
};

export const requireAnyPermission = (permissions: Array<{moduleName: string, action: string}>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({
          message: "Unauthorized"
        });
        return;
      }

      const user = await UserModel.findOne({ 
        _id: req.user.id, 
        isDeleted: false 
      }).populate({
        path: 'roleId',
        populate: { path: 'permissions', select: 'moduleName action' }
      });

      if (!user) {
        res.status(404).json({
          message: "User not found"
        });
        return;
      }

    

      const userPermissions = getUserPermissions(user.roleId);
      const requiredPermissions = permissions.map(p => `${p.moduleName}_${p.action}`);

      const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));

      if (!hasPermission) {
        res.status(403).json({
          message: `Access denied. Required one of: ${requiredPermissions.join(', ')}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({
        message: "Permission check failed"
      });
    }
  };
};