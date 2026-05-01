import { Router } from "express";
import { createBlog, getAllBlogs, getBlogBySlug, getBlogById, updateBlog } from "../controllers/blogController.js";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { ROLES } from "../utils/constant.js";

const router = Router();

router.post("/", requireAuth, requireRoles(ROLES.SUPERADMIN), createBlog); // Only Admin
router.put("/:id", requireAuth, requireRoles(ROLES.SUPERADMIN), updateBlog); // Only Admin
router.get("/", getAllBlogs); // Public
router.get("/:slug", getBlogBySlug); // Public
router.get("/id/:id", getBlogById); // Admin/Private fetch by ID

export default router;
