import { secret } from "encore.dev/config";

const awsAccessKeyId = secret("AWSAccessKeyId");
const awsSecretAccessKey = secret("AWSSecretAccessKey");
const openaiApiKey = secret("OpenAIAPIKey");

export const config = {
  s3: {
    region: "us-east-1",
    bucket: "script-review-agent-bucket",
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
  },
  openaiApiKey,
  retentionDays: 80,
  focusPlatform: "YouTube" as const,
  enableHumanReview: true,
};
