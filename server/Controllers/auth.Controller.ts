import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../Model/user.Model.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const signIn = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const existingUser = await UserModel.findOne({ 
      email,
      isDeleted: false
    })
      .select("+password")
      .populate({
        path: 'roleId',
        select: 'roleName status permissions',
        populate: {
          path: 'permissions',
          select: 'moduleName action'
        }
      });

    if (!existingUser) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    if (existingUser.status !== "Active") {
      return res.status(403).json({
        message: "Your account has been deactivated. Please contact administrator."
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, existingUser.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      { 
        id: existingUser._id, 
        email: existingUser.email
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Collect all permissions from active role
    const permissions: Array<{moduleId: string, moduleName: string, action: string}> = [];
    if (existingUser.roleId && typeof existingUser.roleId === 'object' && 'permissions' in existingUser.roleId) {
      const role = existingUser.roleId as any;
      if (role.status === "Active" && role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach((perm: any) => {
          permissions.push({
            moduleId: perm._id,
            moduleName: perm.moduleName,
            action: perm.action
          });
        });
      }
    }
    
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: existingUser._id,
        userName: existingUser.userName,
        email: existingUser.email,
        status: existingUser.status,
        role: existingUser.roleId,
        permissions
      }
    });
  } 
  catch (error) {
    console.error("Sign in error:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
};