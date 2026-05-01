import { Enquiry } from "../models/enquiry.js";
import { AppError } from "../utils/errorHandler.js";
import { sendEnquiryEmail } from "../utils/sendEmail.js";

/**
 * @desc Create a new enquiry (Public/User)
 * @route POST /api/enquiries
 * @access Public
 */
export const createEnquiry = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.create(req.body);

    // ✅ Send Email to Superadmin
    try {
      await sendEnquiryEmail(enquiry);
    } catch (emailError) {
      console.error("Failed to send enquiry email:", emailError);
    }

    return res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully!",
      data: enquiry,
    });
  } catch (error) {
    console.error("Error creating enquiry:", error);
    next(new AppError("Failed to submit enquiry", 500));
  }
};

/**
 * @desc Get all enquiries (Admin)
 * @route GET /api/enquiries
 * @access Private (Admin)
 */
export const getAllEnquiries = async (req, res, next) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      total: enquiries.length,
      data: enquiries,
    });
  } catch (error) {
    console.error("Error fetching enquiries:", error);
    next(new AppError("Failed to fetch enquiries", 500));
  }
};

/**
 * @desc Delete an enquiry (Admin)
 * @route DELETE /api/enquiries/:id
 * @access Private (Admin)
 */
export const deleteEnquiry = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
    if (!enquiry) {
      return next(new AppError("Enquiry not found", 404));
    }
    return res.status(200).json({
      success: true,
      message: "Enquiry deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting enquiry:", error);
    next(new AppError("Failed to delete enquiry", 500));
  }
};
