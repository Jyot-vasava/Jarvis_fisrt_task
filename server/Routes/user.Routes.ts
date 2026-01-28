import { Router } from "express";
import { 
  createUser, 
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  exportUsersCSV,
  getUsersAggregate,
  getUserByIdAggregate,
  exportUsersCSVAggregate
} from "../Controllers/user.Controller.js";
import { authenticate, requirePermission, requireAnyPermission } from "../Middlewares/auth.Middleware.js";


const router = Router();

// Create user - requires create_user permission
router.post("/", authenticate, requirePermission("Users", "create"), createUser);

// Export users using aggregation 
router.get("/export/aggregate", authenticate, requirePermission("Users", "export"), exportUsersCSVAggregate);

// Export users  (using populate)
router.get("/export", authenticate, requirePermission("Users", "export"), exportUsersCSV);

// Get all users using aggregation
router.get("/aggregate", authenticate, requirePermission("Users", "list"), getUsersAggregate);

// Get user by ID using aggregation
router.get("/aggregate/:id", authenticate, requirePermission("Users", "list"), getUserByIdAggregate);

// Get all users (using populate)
router.get("/", authenticate, requirePermission("Users", "list"), getUsers);

// Get user by ID (using populate)
router.get("/:id", authenticate, requirePermission("Users", "list"), getUserById);

// Update user 
router.put("/:id", authenticate, requireAnyPermission([
  { moduleName: "Users", action: "edit_self" },
  { moduleName: "Users", action: "edit_any" }
]), updateUser);

// Delete user 
router.delete("/:id", authenticate, requirePermission("Users", "delete"), deleteUser);


export default router;