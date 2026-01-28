import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { UserModel } from "../Model/user.Model.js";
import { RoleModel } from "../Model/role.Model.js";
import { exportToCSV } from "../Utils/exportcsv.js";
import { Module } from "../Model/module.Model.js";


const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateUsername = (username: string): boolean => {
  return username.length >= 3 && username.length <= 50;
};

const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

interface RoleDocument {
  _id: string;
  name: string;
  status: string;
  permissions: string[];
}

interface UserDocument {
  _id: string;
  username: string;
  email: string;
  status: string;
  roles: RoleDocument[];
  hobbies: string[];
  createdAt: Date;
}

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userName, email, password, roleId, hobbies, status } = req.body;

    if (!userName || !email || !password || !roleId) {
      res.status(400).json({ message: "Username, email, password, and role are required" });
      return;
    }

    if (!validateUsername(userName)) {
      res.status(400).json({ message: "Username must be between 3 and 50 characters" });
      return;
    }

    if (!validateEmail(email)) {
      res.status(400).json({ message: "Invalid email format" });
      return;
    }

    if (!validatePassword(password)) {
      res.status(400).json({ message: "Password must be at least 6 characters" });
      return;
    }

    const existingUser = await UserModel.findOne({ email, isDeleted: false });
    if (existingUser) {
      res.status(409).json({ message: "Email already exists" });
      return;
    }

    const existingUsername = await UserModel.findOne({ userName, isDeleted: false });
    if (existingUsername) {
      res.status(409).json({ message: "Username already exists" });
      return;
    }

    // Validate role
    const validRole = await RoleModel.findOne({
      _id: roleId,
      isDeleted: false,
      status: "Active"
    });

    if (!validRole) {
      res.status(400).json({ message: "Invalid or inactive role" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await UserModel.create({
      userName,
      email,
      password: hashedPassword,
      roleId,
      hobbies: hobbies || [],
      status: status || "Active"
    });

    const populatedUser = await UserModel.findById(user._id)
      .populate({
        path: 'roleId',
        select: 'roleName status permissions',
        populate: {
          path: 'permissions',
          select: 'moduleName action'
        }
      })
      .select("-password");

    res.status(201).json({ message: "User created successfully", user: populatedUser });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "Failed to create user" });
  }
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = "1", limit = "10", search = "", sortBy = "createdAt", order = "desc", status, roleId } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const searchText = String(search);

    const query: Record<string, unknown> = { isDeleted: false };

    if (status) {
      query.status = status;
    }

    if (roleId) {
      query.roleId = roleId;
    }

    if (searchText) {
      query.$or = [
        { userName: { $regex: searchText, $options: "i" } },
        { email: { $regex: searchText, $options: "i" } }
      ];
    }

    const users = await UserModel.find(query)
      .populate({
        path: 'roleId',
        select: 'roleName status permissions',
        populate: {
          path: 'permissions',
          select: 'moduleName action'
        }
      })
      .sort({ [sortBy as string]: order === "asc" ? 1 : -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .select("-password");

    const total = await UserModel.countDocuments(query);

    res.status(200).json({
      users,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

// Get users using aggregation
export const getUsersAggregate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = "1", limit = "10", search = "", sortBy = "createdAt", order = "desc", status, role } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const searchText = String(search);

    const matchStage: Record<string, any> = { isDeleted: false };

    if (status) {
      matchStage.status = status;
    }

    if (role) {
      try {
        matchStage.roles = new mongoose.Types.ObjectId(role as string);
      } catch (e) {
        res.status(400).json({ message: "Invalid role ID format" });
        return;
      }
    }

    if (searchText) {
      matchStage.$or = [
        { username: { $regex: searchText, $options: "i" } },
        { email: { $regex: searchText, $options: "i" } }
      ];
    }

    const sortField = sortBy as string;
    const sortOrder = order === "asc" ? 1 : -1;
    const sortStage: Record<string, any> = {};
    sortStage[sortField] = sortOrder;

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "roles",
          localField: "roles",
          foreignField: "_id",
          as: "roles"
        }
      },
      {
        $project: {
          password: 0
        }
      },
      { $sort: sortStage },
      {
        $facet: {
          users: [
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum }
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ];

    const result = await UserModel.aggregate(pipeline);

    const users = result[0]?.users || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    res.status(200).json({
      users,
      pagination: { 
        total, 
        page: pageNum, 
        limit: limitNum, 
        totalPages: Math.ceil(total / limitNum) 
      }
    });
  } catch (error) {
    console.error("Get users aggregate error:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    res.status(500).json({ message: "Failed to fetch users using aggregation" });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await UserModel.findOne({ _id: id, isDeleted: false })
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
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
};


//Get user by ID using aggregation
export const getUserByIdAggregate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const pipeline: any[] = [
      { 
        $match: { 
          _id: new mongoose.Types.ObjectId(id),
          isDeleted: false 
        } 
      },
      {
        $lookup: {
          from: "roles",
          localField: "roles",
          foreignField: "_id",
          as: "roles"
        }
      },
      {
        $project: {
          password: 0
        }
      }
    ];

    const users = await UserModel.aggregate(pipeline);

    if (!users || users.length === 0) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(users[0]);
  } catch (error) {
    console.error("Get user aggregate error:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userName, email, password, roleId, hobbies, status } = req.body;

    const targetUser = await UserModel.findOne({ _id: id, isDeleted: false })
      .populate({
        path: 'roleId',
        populate: { path: 'permissions', select: 'moduleName action' }
      });
    
    if (!targetUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const isSelfEdit = req.user?.id === id;

    if (userName && !validateUsername(userName)) {
      res.status(400).json({ message: "Username must be between 3 and 50 characters" });
      return;
    }

    if (email && !validateEmail(email)) {
      res.status(400).json({ message: "Invalid email format" });
      return;
    }

    if (password && !validatePassword(password)) {
      res.status(400).json({ message: "Password must be at least 6 characters" });
      return;
    }

    // Permission check
    const currentUser = await UserModel.findById(req.user?.id)
      .populate({
        path: 'roleId',
        populate: { path: 'permissions', select: 'moduleName action' }
      });

    const userPermissions: string[] = [];
    if (currentUser?.roleId && typeof currentUser.roleId === 'object' && 'permissions' in currentUser.roleId) {
      const role = currentUser.roleId as any;
      if (role.status === "Active" && role.permissions) {
        role.permissions.forEach((perm: Module) => {
          userPermissions.push(`${perm.moduleName}_${perm.action}`);
        });
      }
    }

    if (!isSelfEdit && !userPermissions.includes('Users_edit_any')) {
      res.status(403).json({ message: "You don't have permission to edit other users" });
      return;
    }

    if (isSelfEdit && !userPermissions.includes('Users_edit_self')) {
      res.status(403).json({ message: "You don't have permission to edit your profile" });
      return;
    }

    if (email && email !== targetUser.email) {
      const existingEmail = await UserModel.findOne({ email, isDeleted: false, _id: { $ne: id } });
      if (existingEmail) {
        res.status(409).json({ message: "Email already exists" });
        return;
      }
    }

    if (userName && userName !== targetUser.userName) {
      const existingUsername = await UserModel.findOne({ userName, isDeleted: false, _id: { $ne: id } });
      if (existingUsername) {
        res.status(409).json({ message: "Username already exists" });
        return;
      }
    }

    // Validate role if provided
    if (roleId) {
      const validRole = await RoleModel.findOne({
        _id: roleId,
        isDeleted: false,
        status: "Active"
      });

      if (!validRole) {
        res.status(400).json({ message: "Invalid or inactive role" });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (userName) updateData.userName = userName;
    if (email) updateData.email = email;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (hobbies !== undefined) updateData.hobbies = hobbies;
    if (roleId) updateData.roleId = roleId;
    if (status) updateData.status = status;

    const updatedUser = await UserModel.findByIdAndUpdate(id, updateData, { new: true })
      .populate({
        path: 'roleId',
        select: 'roleName status permissions',
        populate: {
          path: 'permissions',
          select: 'moduleName action'
        }
      })
      .select("-password");

    res.status(200).json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const targetUser = await UserModel.findOne({ _id: id, isDeleted: false });

    if (!targetUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (req.user?.id === id) {
      res.status(403).json({ message: "You cannot delete your own account" });
      return;
    }

    await UserModel.findByIdAndUpdate(id, { isDeleted: true });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

interface UserExport {
  username: string;
  email: string;
  status: string;
  roles: string;
  hobbies: string;
  createdAt: string;
}

export const exportUsersCSV = async (req: Request, res: Response): Promise<void> => {
  try {
    const query: Record<string, unknown> = { isDeleted: false };

    const users = await UserModel.find(query)
      .populate({
        path: 'roleId',
        select: 'roleName'
      })
      .select("-password")
      .lean();

    const formattedUsers = users.map((user: any) => ({
      userName: user.userName,
      email: user.email,
      status: user.status,
      role: user.roleId?.roleName || 'No Role',
      hobbies: user.hobbies.join(", "),
      createdAt: formatDateTime(user.createdAt)
    }));

    exportToCSV(res, formattedUsers, "Users.csv");
  } catch (error) {
    console.error("Export users error:", error);
    res.status(500).json({ message: "Failed to export users" });
  }
};

// NEW: Export users CSV using aggregation
export const exportUsersCSVAggregate = async (req: Request, res: Response): Promise<void> => {
  try {
    const pipeline: any[] = [
      { $match: { isDeleted: false } },
      {
        $lookup: {
          from: "roles",
          localField: "roles",
          foreignField: "_id",
          as: "roles"
        }
      },
      {
        $project: {
          username: 1,
          email: 1,
          status: 1,
          hobbies: 1,
          createdAt: 1,
          roles: {
            $map: {
              input: "$roles",
              as: "role",
              in: "$role.name"
            }
          }
        }
      }
    ];

    const users = await UserModel.aggregate(pipeline);

    const formattedUsers: UserExport[] = users.map((user) => ({
      username: user.username,
      email: user.email,
      status: user.status,
      roles: user.roles.join(", "),
      hobbies: user.hobbies.join(", "),
      createdAt: formatDateTime(user.createdAt)
    }));

    exportToCSV(res, formattedUsers, "Users.csv");
  } catch (error) {
    console.error("Export users aggregate error:", error);
    res.status(500).json({ message: "Failed to export users" });
  }
};