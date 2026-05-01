/**
 * Agent Itinerary Controller
 *
 * Handles CRUD operations for itineraries assigned to specific agents.
 */

import { AgentItinerary } from "../models/AgentItinerary.js";
import slugify from "slugify";
import { ROLES } from "../utils/constant.js";
import { getPresignedViewUrl } from "../services/s3Service.js";
import mongoose from "mongoose";
import Agent from "../models/agent.js";

/* ── Helpers ── */

const CARD_SELECT =
  "_id agentId title slug type destination city country duration durationDays departureDate " +
  "coverImageUrl gallery shortDescription priceFrom discountedPrice asBestQuote " +
  "themes classification packageType visibility createdAt";

/**
 * Sign S3 URLs in an agent itinerary document
 */
async function signAgentItinerary(itinerary) {
  if (!itinerary) return null;
  const obj = itinerary.toObject ? itinerary.toObject() : itinerary;

  if (obj.coverImageUrl) {
    obj.coverImageUrl = await getPresignedViewUrl(obj.coverImageUrl);
  }

  if (Array.isArray(obj.gallery)) {
    obj.gallery = await Promise.all(
      obj.gallery.map((img) => getPresignedViewUrl(img))
    );
  }

  return obj;
}

async function generateUniqueSlug(base) {
  const root = slugify(base, { lower: true, strict: true });
  let slug = root;
  let counter = 2;

  while (await AgentItinerary.exists({ slug })) {
    slug = `${root}-${counter}`;
    counter += 1;
  }
  return slug;
}

function toArray(val) {
  if (Array.isArray(val)) return val.map((s) => s.trim()).filter(Boolean);
  if (typeof val === "string")
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function parseDurationDays(duration) {
  if (!duration) return 0;
  const match = duration.match(/(\d+)\s*day/i);
  return match ? parseInt(match[1], 10) : 0;
}

function mapPayloadToModel(payload) {
  const {
    title,
    travelType,
    type: modelType,
    destination,
    duration,
    themes,
    classification,
    packageType,
    visibility,
    destinationDetail,
    shortDescription,
    days,
    dayPlans,
    inclusions,
    exclusions,
    asPerCategory,
    asBestQuote,
    standardPrice,
    priceFrom,
    discountedPrice,
    termsConditions,
    paymentMode,
    cancellationPolicy,
    mediaUrls,
    gallery,
    agentId,
    departureDate,
  } = payload;

  const type = (modelType || travelType || "domestic").toLowerCase();

  return {
    agentId,
    title: (title || "").trim(),
    type,
    destination: (destination || "").trim(),
    city: type === "domestic" ? (destination || "").trim() : undefined,
    country: type === "international" ? (destination || "").trim() : undefined,
    departureDate: departureDate || undefined,
    duration: duration || "",
    durationDays: parseDurationDays(duration),
    themes: Array.isArray(themes) ? themes : [],
    classification: Array.isArray(classification) ? classification : [],
    packageType: packageType || "Flexible",
    visibility: visibility || "Public",
    shortDescription: (shortDescription || destinationDetail || "").substring(0, 150).trim(),
    destinationDetail: (destinationDetail || "").trim(),
    coverImageUrl: (gallery && gallery.length > 0) ? gallery[0] : (Array.isArray(mediaUrls) && mediaUrls.length > 0 ? mediaUrls[0] : ""),
    gallery: Array.isArray(gallery) ? gallery : (Array.isArray(mediaUrls) ? mediaUrls : []),
    dayPlans: (Array.isArray(dayPlans) ? dayPlans : (Array.isArray(days) ? days : [])).map(({ day, title: dayTitle, locationDetail }) => ({
      day: Number(day) || 1,
      title: (dayTitle || "").trim(),
      locationDetail: (locationDetail || "").trim(),
    })),
    inclusions: toArray(inclusions),
    exclusions: toArray(exclusions),
    asPerCategory: Boolean(asPerCategory),
    asBestQuote: Boolean(asBestQuote),
    priceFrom: asBestQuote ? 0 : (Number(priceFrom) || Number(standardPrice) || 0),
    discountedPrice: asBestQuote ? 0 : Number(discountedPrice) || 0,
    termsConditions: (termsConditions || "").trim(),
    paymentMode: (paymentMode || "").trim(),
    cancellationPolicy: (cancellationPolicy || "").trim(),
    isPublished: true,
  };
}

/* ── Controller Methods ── */

export async function createAgentItinerary(req, res) {
  try {
    const { title, travelType, destination, agentId } = req.body;
    let effectiveAgentId = agentId;
    if (!effectiveAgentId && req.user?.role === ROLES.AGENT) {
      effectiveAgentId = req.user.id;
    }

    const isAdmin = req.user?.role === ROLES.ADMIN || req.user?.role === ROLES.SUPERADMIN;
    if (!effectiveAgentId && !isAdmin) return res.status(400).json({ message: "Agent assignment is required." });
    if (!title?.trim()) return res.status(400).json({ message: "Title is required." });
    if (!travelType) return res.status(400).json({ message: "Travel type is required." });
    if (!destination?.trim()) return res.status(400).json({ message: "Destination is required." });

    const slug = await generateUniqueSlug(`${title}-${destination}`);
    req.body.agentId = effectiveAgentId; // Ensure it's passed to mapPayloadToModel
    const data = mapPayloadToModel(req.body);

    const itinerary = new AgentItinerary({
      ...data,
      slug,
      createdBy: req.user?.id,
      creatorModel: req.user?.role === ROLES.AGENT ? "Agent" : "AdminLoginCredential",
    });

    await itinerary.save();
    const signedItinerary = await signAgentItinerary(itinerary);
    return res.status(201).json({ message: "Agent itinerary created successfully.", data: signedItinerary });
  } catch (error) {
    console.error("Create Agent Itinerary Error:", error);
    return res.status(500).json({ message: "Error creating agent itinerary.", error: error.message });
  }
}

export async function listAgentItineraries(req, res) {
  try {
    const { agentId, type, destination, classification, limit = 12, skip = 0 } = req.query;
    
    const filter = { isPublished: true };

    // Strict Filtering Logic
    if (req.user?.role === ROLES.AGENT) {
      // Agents can ONLY see their own itineraries
      filter.agentId = req.user.id;
    } else if (req.user?.role === ROLES.ADMIN || req.user?.role === ROLES.SUPERADMIN) {
      // Admins can see all or filter by a specific agentId
      if (agentId === "admin") {
        filter.agentId = { $in: [null, undefined] }; // Admin self itineraries
      } else if (agentId === "agents_only") {
        filter.agentId = { $ne: null }; // Only agent itineraries
      } else if (agentId && agentId !== "all") {
        if (mongoose.Types.ObjectId.isValid(agentId)) {
          filter.agentId = agentId;
        } else {
          // Find agent by company slug
          const companyName = agentId.replace(/-/g, " ");
          const agent = await Agent.findOne({ company: { $regex: new RegExp(`^${companyName}$`, "i") } });
          if (agent) filter.agentId = agent._id;
        }
      }
      // If no agentId is provided, filter remains { isPublished: true }, which shows all (including null)
    } else {
      // Public / Unauthenticated: Cannot see Admin self itineraries
      filter.agentId = { $ne: null };

      if (agentId && agentId !== "all" && agentId !== "agents_only") {
        if (mongoose.Types.ObjectId.isValid(agentId)) {
          filter.agentId = agentId;
        } else {
          // Find agent by company slug
          const companyName = agentId.replace(/-/g, " ");
          const agent = await Agent.findOne({ company: { $regex: new RegExp(`^${companyName}$`, "i") } });
          if (agent) filter.agentId = agent._id;
          else return res.status(200).json({ data: [], pagination: { total: 0, limit: parseInt(limit, 10), skip: parseInt(skip, 10) } });
        }
      }
    }

    if (type) filter.type = type.toLowerCase();
    if (destination) {
      const destName = destination.replace(/-/g, " ");
      filter.destination = new RegExp(`^${destName}$`, "i");
    }
    if (classification) {
      const tags = toArray(classification);
      if (tags.length > 0) filter.classification = { $in: tags };
    }

    const [itineraries, total] = await Promise.all([
      AgentItinerary.find(filter)
        .select(CARD_SELECT)
        .populate("agentId", "company firstName lastName email")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit, 10))
        .skip(parseInt(skip, 10)),
      AgentItinerary.countDocuments(filter),
    ]);

    const signedItineraries = await Promise.all(
      itineraries.map((it) => signAgentItinerary(it))
    );

    return res.status(200).json({
      message: "Agent itineraries retrieved successfully.",
      data: signedItineraries,
      pagination: { total, limit: parseInt(limit, 10), skip: parseInt(skip, 10) },
    });
  } catch (error) {
    console.error("List Agent Itineraries Error:", error);
    return res.status(500).json({ message: "Error retrieving agent itineraries.", error: error.message });
  }
}

export async function getAgentItineraryBySlug(req, res) {
  try {
    const { slug } = req.params;
    const itinerary = await AgentItinerary.findOne({ slug });

    if (!itinerary) return res.status(404).json({ message: "Itinerary not found." });

    const signedItinerary = await signAgentItinerary(itinerary);
    return res.status(200).json({ message: "Itinerary retrieved successfully.", data: signedItinerary });
  } catch (error) {
    return res.status(500).json({ message: "Error retrieving itinerary.", error: error.message });
  }
}

export async function updateAgentItinerary(req, res) {
  try {
    const { slug } = req.params;
    const updateData = mapPayloadToModel(req.body);

    const existing = await AgentItinerary.findOne({ slug });
    if (!existing) return res.status(404).json({ message: "Itinerary not found." });

    // Authorization check: Only assigned agent or admin can update
    if (req.user.role === ROLES.AGENT && existing.agentId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized to update this itinerary." });
    }

    if (req.body.title || req.body.destination) {
      const baseTitle = req.body.title || existing.title;
      const baseDest = req.body.destination || existing.destination;
      updateData.slug = await generateUniqueSlug(`${baseTitle}-${baseDest}`);
    }

    const itinerary = await AgentItinerary.findOneAndUpdate(
      { slug },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    const signedItinerary = await signAgentItinerary(itinerary);
    return res.status(200).json({ message: "Itinerary updated successfully.", data: signedItinerary });
  } catch (error) {
    console.error("Update Agent Itinerary Error:", error);
    return res.status(500).json({ message: "Error updating itinerary.", error: error.message });
  }
}

export async function deleteAgentItinerary(req, res) {
  try {
    const { slug } = req.params;
    const existing = await AgentItinerary.findOne({ slug });
    if (!existing) return res.status(404).json({ message: "Itinerary not found." });

    // Authorization check
    if (req.user.role === ROLES.AGENT && existing.agentId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized to delete this itinerary." });
    }

    await AgentItinerary.findOneAndDelete({ slug });
    return res.status(200).json({ message: "Itinerary deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting itinerary.", error: error.message });
  }
}

