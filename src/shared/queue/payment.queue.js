import { Queue } from "bullmq";
import { redisConfig } from "../../config/redis.js";

const paymentQueue = new Queue("payment", {
  connection: redisConfig,
});

export default paymentQueue;
