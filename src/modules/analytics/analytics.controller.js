import * as analyticsService from "./analytics.service.js";
import { successResponse } from "../../shared/utils/response.utils.js";

export const getDashboardSummary = async (req, res, next) => {
  try {
    const summary = await analyticsService.getDashboardSummary();
    return successResponse(res, summary, "Dashboard summary metrics retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const getSalesTrends = async (req, res, next) => {
  try {
    const { days } = req.query;
    const trends = await analyticsService.getSalesTrends(days);
    return successResponse(res, trends, "Sales trends retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const getTopSellingProducts = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const products = await analyticsService.getTopSellingProducts(limit);
    return successResponse(res, products, "Top selling products retrieved successfully");
  } catch (error) {
    next(error);
  }
};
