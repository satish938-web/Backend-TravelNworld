import { body } from "express-validator";
import { ROLES } from "../../utils/constant.js";

export const validateRegister = [
  body("email").isEmail().withMessage("Please provide a valid email"),
  body("firstName").notEmpty().withMessage("First name is required"),
  body("lastName").optional().isString().withMessage("Last name must be a string"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("phone")
    .optional()
    .matches(/^\+?[0-9]{7,15}$/)
    .withMessage("Please provide a valid phone number"),
  body("role")
    .optional()
    .isIn(Object.values(ROLES))
    .withMessage("Invalid role"),
];
