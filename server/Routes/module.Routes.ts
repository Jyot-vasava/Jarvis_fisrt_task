import { Router } from "express";
import { authenticate } from "../Middlewares/auth.Middleware.js";
import { getModulesGrouped, getModules } from "../Controllers/module.Controller.js";

const moduleRouter = Router();

// All module routes require authentication
moduleRouter.use(authenticate);


moduleRouter.get("/grouped", getModulesGrouped);

// Get all modules
moduleRouter.get("/", getModules);



export default moduleRouter;