import { Queue } from "bullmq";
import { redisConfig } from "../../config/redis.js";

const emailQueue = new Queue("email", {
  connection: redisConfig,
});

export default emailQueue;
