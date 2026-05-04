#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { MercredistesScraperStack } from "./lib/stack";

const app = new cdk.App();

// Get stage from command-line context or default to 'dev'
const stage = app.node.tryGetContext("stage") || process.env.CDK_STAGE || "dev";

// Load stage-specific configuration
const stageConfig = app.node.tryGetContext(stage);
if (!stageConfig) {
  throw new Error(`Stage "${stage}" not found in cdk.json context`);
}

// Resolve environment variables in account ID
let accountId = stageConfig.accountId;
if (accountId && accountId.startsWith("${env:") && accountId.endsWith("}")) {
  const envVar = accountId.match(/\$\{env:([^}]+)\}/)?.[1];
  if (envVar) {
    accountId = process.env[envVar] || "";
    if (!accountId) {
      console.warn(`Warning: Environment variable ${envVar} is not set.`);
      // Use a placeholder for test stage
      if (stage === "test") {
        accountId = "000000000000";
      } else {
        throw new Error(
          `Environment variable ${envVar} is required for stage "${stage}"`,
        );
      }
    }
  }
}

// Account ID is required
if (!accountId) {
  if (stage === "test") {
    accountId = "000000000000";
  } else {
    throw new Error(
      `Account ID must be set for stage "${stage}". Set AWS_ACCOUNT_ID environment variable.`,
    );
  }
}

const env = {
  account: accountId,
  region: stageConfig.region,
};

new MercredistesScraperStack(app, `mercredistes-scraper-${stage}`, {
  stage,
  stageConfig,
  env,
  stackName: `mercredistes-scraper-${stage}`,
});

app.synth();
