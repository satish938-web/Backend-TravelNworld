import { Router } from "express";
import { createEnquiry, getAllEnquiries, deleteEnquiry } from "../controllers/enquiryController.js";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validators/validationErrorHandler.js";
import { validateCreateEnquiry } from "../middlewares/validators/enquiryValidator.js";
import { ROLES } from "../utils/constant.js";

const router = Router();

router.post("/", validateCreateEnquiry, validateRequest, createEnquiry);

router.get("/", requireAuth, requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), getAllEnquiries);
router.delete("/:id", requireAuth, requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), deleteEnquiry);

export default router;
