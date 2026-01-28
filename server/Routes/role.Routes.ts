import { Router } from "express";
import { 
  createRole, 
  getRoles,
  getRoleById,
  updateRole, 
  deleteRole,
  getRolesAggregate
} from "../Controllers/role.Controller.js";
import { authenticate, requirePermission } from "../Middlewares/auth.Middleware.js";

const roleRouter = Router();

// All role routes require authentication
roleRouter.use(authenticate);

// Create role - requires create permission
roleRouter.post("/", requirePermission("Roles", "create"), createRole);

// Get all roles using aggregation - MUST be before /:id
roleRouter.get("/aggregate", requirePermission("Roles", "list"), getRolesAggregate);

// Get all roles (using find)
roleRouter.get("/", getRoles);

// Get role by ID - requires list permission
roleRouter.get("/:id", requirePermission("Roles", "list"), getRoleById);

// Update role - requires edit permission
roleRouter.put("/:id", requirePermission("Roles", "edit"), updateRole);

// Delete role - requires delete permission
roleRouter.delete("/:id", requirePermission("Roles", "delete"), deleteRole);

export default roleRouter;