import * as agentService from "../services/agentService.js";
import { AppError } from "../utils/errorHandler.js";
import { getPresignedViewUrl } from "../services/s3Service.js";
import AgentReview from "../models/AgentReview.js";
import { signAgent, signReview } from "../utils/agentUtils.js";

/**
 * Get all agents (Admin only)
 */
export const getAllAgents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { role, search } = req.query;

    const result = await agentService.getAllAgents(page, limit, role, search);

    const signedAgents = await Promise.all(
      result.agents.map((agent) => signAgent(agent))
    );

    res.status(200).json({
      success: true,
      data: signedAgents,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get verified agents (Public)
 */
export const getVerifiedAgents = async (req, res, next) => {
  try {
    const agents = await agentService.getVerifiedAgents();
    
    const signedAgents = await Promise.all(
      agents.map((agent) => signAgent(agent))
    );

    res.status(200).json({
      success: true,
      data: signedAgents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get agent details by ID (Public)
 */
export const getAgentById = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const result = await agentService.getAgentById(agentId);
    
    const signedAgent = await signAgent(result.agent);
    
    const signedReviews = await Promise.all(
      (result.reviews || []).map((review) => signReview(review))
    );

    res.status(200).json({
      success: true,
      data: signedAgent,
      reviews: signedReviews
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create agent (Admin/Superadmin)
 */
export const createAgent = async (req, res, next) => {
  try {
    const result = await agentService.createAgent(req.body, req.user);
    const signedAgent = await signAgent(result.agent);
    res.status(201).json({
      success: true,
      message: result.message,
      data: signedAgent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update agent (Admin/Superadmin)
 */
export const updateAgent = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const result = await agentService.updateAgent(agentId, req.body, req.user);

    const signedAgent = await signAgent(result.agent);
    res.status(200).json({
      success: true,
      message: result.message,
      data: signedAgent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete agent (Admin/Superadmin)
 */
export const deleteAgent = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const result = await agentService.deleteAgent(agentId, req.user);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit a review (Authenticated users)
 */
export const submitReview = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const result = await agentService.addAgentReview(agentId, req.body, req.user);
    
    res.status(201).json({
      success: true,
      message: result.message,
      data: result.review
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle agent status
 */
export const toggleAgentStatus = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      throw new AppError("isActive must be a boolean value", 400);
    }

    const result = await agentService.toggleAgentStatus(agentId, isActive, req.user);

    const signedAgent = await signAgent(result.agent);
    res.status(200).json({
      success: true,
      message: result.message,
      data: signedAgent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a public photo/video contribution (Public)
 */
export const addPublicPhoto = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { url } = req.body;

    if (!url) {
      throw new AppError("Photo/Video URL is required", 400);
    }

    // Use a simplified service call or direct update for public contribution
    const result = await agentService.addAgentPhoto(agentId, url);

    const signedAgent = await signAgent(result.agent);

    res.status(200).json({
      success: true,
      message: "Photo shared successfully! It will appear in the gallery soon.",
      data: signedAgent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all reviews for moderation (SuperAdmin)
 */
export const getAllReviews = async (req, res, next) => {
  try {
    const reviews = await AgentReview.find().populate("agentId", "company firstName lastName").sort({ createdAt: -1 });
    const signedReviews = await Promise.all(
      reviews.map((r) => signReview(r))
    );
    res.status(200).json({ success: true, data: signedReviews });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a specific review (SuperAdmin)
 */
export const updateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const review = await AgentReview.findByIdAndUpdate(reviewId, req.body, { new: true });
    if (!review) throw new AppError("Review not found", 404);
    
    const signedReview = await signReview(review);
    res.status(200).json({ success: true, message: "Review updated", data: signedReview });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a specific review (SuperAdmin)
 */
export const deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const review = await AgentReview.findByIdAndDelete(reviewId);
    if (!review) throw new AppError("Review not found", 404);
    
    res.status(200).json({ success: true, message: "Review deleted" });
  } catch (error) {
    next(error);
  }
};
