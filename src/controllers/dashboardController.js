import Agent from "../models/agent.js";
import User from "../models/User.js";
import { Itinerary } from "../models/Itinerary.js";
import { Enquiry } from "../models/enquiry.js";
import AdminLoginCredential from "../models/adminLoginCredential.js";
import { ROLES } from "../utils/constant.js";

export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalAgents,
      totalAdmins,
      totalItineraries,
      totalEnquiries,
      latestEnquiries,
      latestAgents
    ] = await Promise.all([
      Agent.countDocuments({ role: ROLES.AGENT }),
      AdminLoginCredential.countDocuments({ role: { $in: [ROLES.SUPERADMIN, ROLES.ADMIN] } }),
      Itinerary.countDocuments(),
      Enquiry.countDocuments(),
      Enquiry.find().sort({ createdAt: -1 }).limit(3),
      Agent.find({ role: ROLES.AGENT }).sort({ createdAt: -1 }).limit(3)
    ]);

    // Combine and format activities
    const activities = [
      ...latestEnquiries.map(e => ({
        activity: `New Enquiry from ${e.name}`,
        user: e.email,
        time: e.createdAt,
        status: "Success"
      })),
      ...latestAgents.map(a => ({
        activity: `New Agent registered: ${a.company || a.firstName}`,
        user: a.email,
        time: a.createdAt,
        status: "Success"
      }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        totalAgents,
        totalAdmins,
        totalItineraries,
        totalEnquiries,
        activities,
        successRate: "99%" 
      }
    });
  } catch (error) {
    console.error("getDashboardStats error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
