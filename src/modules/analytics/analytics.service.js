import Order from "../order/order.model.js";
import User from "../auth/user.model.js";

/**
 * Get dashboard overview metrics.
 */
export const getDashboardSummary = async () => {
  const [totalRevenueResult, totalOrders, activeCustomers, statusCounts] = await Promise.all([
    // Total Revenue (paid orders only)
    Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    // Total Orders
    Order.countDocuments(),
    // Active customers (unique users who placed paid orders)
    Order.distinct("user", { paymentStatus: "paid" }).then((users) => users.length),
    // Order counts grouped by status
    Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const totalRevenue = totalRevenueResult[0]?.total || 0;

  // Format status counts nicely
  const statusStats = {
    pending_payment: 0,
    confirmed: 0,
    preparing: 0,
    out_for_delivery: 0,
    delivered: 0,
    cancelled: 0,
  };
  statusCounts.forEach((item) => {
    if (statusStats[item._id] !== undefined) {
      statusStats[item._id] = item.count;
    }
  });

  return {
    totalRevenue,
    totalOrders,
    activeCustomers,
    orderStatusCounts: statusStats,
  };
};

/**
 * Get daily sales trends over a specified period (default last 30 days).
 */
export const getSalesTrends = async (days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days, 10));

  const trends = await Order.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return trends.map((item) => ({
    date: item._id,
    revenue: item.revenue,
    orders: item.orders,
  }));
};

/**
 * Get top selling products by quantity.
 */
export const getTopSellingProducts = async (limit = 10) => {
  const products = await Order.aggregate([
    { $match: { paymentStatus: "paid" } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        name: { $first: "$items.name" },
        totalQuantity: { $sum: "$items.quantity" },
        totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: parseInt(limit, 10) },
  ]);

  return products.map((item) => ({
    productId: item._id,
    name: item.name,
    totalQuantity: item.totalQuantity,
    totalRevenue: item.totalRevenue,
  }));
};
