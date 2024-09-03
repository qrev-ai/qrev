import AWS from "aws-sdk";
import { logger } from "./logger.js";

export function awsSdkSetup() {
    AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        // region: process.env.AWS_REGION,
    });
    logger.info("AWS SDK setup complete");
}
