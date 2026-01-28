import { Router } from "express";
import { signIn } from "../Controllers/auth.Controller.js";


const router = Router();


router.post("/signin", signIn);



export default router;
