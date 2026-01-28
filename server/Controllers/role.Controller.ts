import { Request, Response } from "express";
import { RoleModel } from "../Model/role.Model.js";
import { ModuleModel } from "../Model/module.Model.js";
import mongoose from "mongoose";

const validateRoleName = (name: string): boolean => {
  return name.length >= 2 && name.length <= 50;
};

export const createRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roleName, permissions, status } = req.body;

    

    // Validate role name
    if (!roleName) {
      console.log('Validation failed: Role name is missing');
      res.status(400).json({ message: "Role name is required" });
      return;
    }

    if (!validateRoleName(roleName)) {
      console.log('Validation failed: Role name length invalid');
      res.status(400).json({ message: "Role name must be between 2 and 50 characters" });
      return;
    }

    // Check if role already exists
    const roleExists = await RoleModel.findOne({ 
      roleName: { $regex: new RegExp(`^${roleName.trim()}$`, 'i') }, 
      isDeleted: false
    });
    
    if (roleExists) {
      console.log('Role already exists:', roleExists._id);
      res.status(409).json({ message: "Role name already exists" });
      return;
    }

    // Validate permissions array
    let validatedPermissions: mongoose.Types.ObjectId[] = [];
    
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      // Ensure all permission IDs are valid MongoDB ObjectIds
      const invalidIds = permissions.filter(id => {
        const isValid = mongoose.Types.ObjectId.isValid(id);
        if (!isValid) {
        }
        return !isValid;
      });
      
      if (invalidIds.length > 0) {
        res.status(400).json({ 
          message: "Some permission IDs are invalid",
          invalidIds 
        });
        return;
      }
    
      
      const validModules = await ModuleModel.find({
        _id: { $in: permissions.map(id => new mongoose.Types.ObjectId(id)) },
        isDeleted: false
      });

      
      if (validModules.length > 0) {
        console.log('   Valid modules found:');
        validModules.forEach(m => {
        });
      }

      if (validModules.length !== permissions.length) {
        const foundIds = validModules.map(m => m._id.toString());
        const missingIds = permissions.filter(id => !foundIds.includes(id));
        
        // Check if these IDs exist at all (even if deleted)
        const deletedModules = await ModuleModel.find({
          _id: { $in: missingIds.map(id => new mongoose.Types.ObjectId(id)) }
        });
        
        if (deletedModules.length > 0) {
          console.error('Found as deleted modules:', deletedModules.map(m => m._id.toString()));
        }
        
        res.status(400).json({ 
          message: "Some permissions do not exist or are deleted",
          missingIds,
          foundCount: validModules.length,
          requestedCount: permissions.length
        });
        return;
      }
      validatedPermissions = permissions.map(id => new mongoose.Types.ObjectId(id));
    } 

    const roleData = {
      roleName: roleName.trim(),
      status: status || "Active",
      permissions: validatedPermissions,
      isDeleted: false
    };
    // Create the role
    const role = await RoleModel.create(roleData);


    // Populate permissions for response
    const populatedRole = await RoleModel.findById(role._id)
      .populate('permissions', 'moduleName action');

    res.status(201).json({ 
      message: "Role created successfully", 
      role: populatedRole 
    });
  } catch (error) {
    
    res.status(500).json({ 
      message: "Failed to create role",
      error: error instanceof Error ? error.message : "Unknown error",
      // ...(process.env.NODE_ENV === 'development' && { 
      //   stack: error instanceof Error ? error.stack : undefined 
      // })
    });
  }
};

export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = "1", limit = "10", search = "", sortBy = "createdAt", order = "desc", status } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const searchText = String(search);

    const query: Record<string, unknown> = { isDeleted: false };

    if (status) {
      query.status = status;
    }

    if (searchText) {
      query.roleName = { $regex: searchText, $options: "i" };
    }

    const roles = await RoleModel.find(query)
      .populate('permissions', 'moduleName action description')
      .sort({ [sortBy as string]: order === "asc" ? 1 : -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await RoleModel.countDocuments(query);

    // console.log(`Fetched ${roles.length} roles out of ${total} total`);

    res.status(200).json({ 
      roles,
      pagination: {
        total, 
        page: pageNum, 
        limit: limitNum, 
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error("Get roles error:", error);
    res.status(500).json({ message: "Failed to fetch roles" });
  }
};

export const getRolesAggregate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = "1", limit = "10", search = "", sortBy = "createdAt", order = "desc", status } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const searchText = String(search);

    const matchStage: Record<string, any> = { isDeleted: false };

    if (status) {
      matchStage.status = status;
    }

    if (searchText) {
      matchStage.roleName = { $regex: searchText, $options: "i" };
    }

    const sortField = sortBy as string;
    const sortOrder = order === "asc" ? 1 : -1;
    const sortStage: Record<string, any> = {};
    sortStage[sortField] = sortOrder;

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "modules",
          localField: "permissions",
          foreignField: "_id",
          as: "permissions"
        }
      },
      {
        $project: {
          roleName: 1,
          status: 1,
          permissions: {
            $map: {
              input: "$permissions",
              as: "perm",
              in: {
                _id: "$$perm._id",
                moduleName: "$$perm.moduleName",
                action: "$$perm.action",
                description: "$$perm.description"
              }
            }
          },
          createdAt: 1,
          updatedAt: 1
        }
      },
      { $sort: sortStage },
      {
        $facet: {
          roles: [
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum }
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ];

    const result = await RoleModel.aggregate(pipeline);

    const roles = result[0]?.roles || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    res.status(200).json({ 
      roles,
      pagination: {
        total, 
        page: pageNum, 
        limit: limitNum, 
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error("Get roles aggregate error:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
    res.status(500).json({ message: "Failed to fetch roles using aggregation" });
  }
};

export const updateRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { roleName, permissions, status } = req.body;

    console.log('Update role request:', { id, roleName, permissions, status });

    const role = await RoleModel.findOne({ _id: id, isDeleted: false });
    if (!role) {
      res.status(404).json({ message: "Role not found" });
      return;
    }

    if (roleName !== undefined) {
      if (!roleName) {
        res.status(400).json({ message: "Role name cannot be empty" });
        return;
      }
      if (!validateRoleName(roleName)) {
        res.status(400).json({ message: "Role name must be between 2 and 50 characters" });
        return;
      }
    }

    if (permissions !== undefined && !Array.isArray(permissions)) {
      res.status(400).json({ message: "Permissions must be an array" });
      return;
    }

    let validatedPermissions: mongoose.Types.ObjectId[] | undefined;
    if (permissions !== undefined) {
      if (Array.isArray(permissions) && permissions.length > 0) {
        const invalidIds = permissions.filter(id => !mongoose.Types.ObjectId.isValid(id));
        if (invalidIds.length > 0) {
          console.error('Invalid permission IDs:', invalidIds);
          res.status(400).json({ message: "One or more permission IDs are invalid" });
          return;
        }

        const validModules = await ModuleModel.find({
          _id: { $in: permissions.map(id => new mongoose.Types.ObjectId(id)) },
          isDeleted: false
        });

        if (validModules.length !== permissions.length) {
          res.status(400).json({ message: "One or more permissions do not exist" });
          return;
        }

        validatedPermissions = permissions.map(id => new mongoose.Types.ObjectId(id));
      } else {
        validatedPermissions = [];
      }
    }

    if (roleName && roleName !== role.roleName) {
      const nameExists = await RoleModel.findOne({ 
        roleName: { $regex: new RegExp(`^${roleName.trim()}$`, 'i') }, 
        isDeleted: false,
        _id: { $ne: id }
      });
      
      if (nameExists) {
        res.status(409).json({ message: "Role name already exists" });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (roleName !== undefined) updateData.roleName = roleName.trim();
    if (validatedPermissions !== undefined) updateData.permissions = validatedPermissions;
    if (status !== undefined) updateData.status = status;

    const updatedRole = await RoleModel.findByIdAndUpdate(id, updateData, { new: true })
      .populate('permissions', 'moduleName action');

    res.status(200).json({ message: "Role updated successfully", role: updatedRole });
  } catch (error) {
    console.error("Update role error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    res.status(500).json({ 
      message: "Failed to update role",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const role = await RoleModel.findOne({ _id: id, isDeleted: false });
    if (!role) {
      res.status(404).json({ message: "Role not found" });
      return;
    }

    await RoleModel.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() });

    res.status(200).json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Delete role error:", error);
    res.status(500).json({ message: "Failed to delete role" });
  }
};

export const getRoleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const role = await RoleModel.findOne({ _id: id, isDeleted: false })
      .populate('permissions', 'moduleName action description');

    if (!role) {
      res.status(404).json({ message: "Role not found" });
      return;
    }

    res.status(200).json(role);
  } catch (error) {
    console.error("Get role error:", error);
    res.status(500).json({ message: "Failed to fetch role" });
  }
};