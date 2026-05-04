import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import * as apigatewayIntegrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "path";

interface StageConfig {
  profile?: string;
  region: string;
  accountId: string;
  extension: string;
  googleAccessToken?: string;
  githubAccessToken?: string;
  lambda: {
    memorySize: number;
    timeout: number;
    logRetention: number;
  };
}

interface MercredistesScraperStackProps extends cdk.StackProps {
  stage: string;
  stageConfig: StageConfig;
}

export class MercredistesScraperStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: MercredistesScraperStackProps,
  ) {
    super(scope, id, props);

    const { stage, stageConfig } = props;
    const serviceName = "mercredistes-scraper";
    const layerArn =
      "arn:aws:lambda:eu-central-1:553035198032:layer:git-lambda2:8";

    // Create Lambda execution role
    const lambdaRole = new iam.Role(this, "LambdaExecutionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Lambda execution role for Mercredistes Scraper",
    });

    // Add CloudWatch Logs permissions
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${serviceName}*:*`,
        ],
      }),
    );

    // Add permission for triggerAddContent to invoke addContent
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["lambda:InvokeFunction"],
        resources: [
          `arn:aws:lambda:${this.region}:${this.account}:function:${serviceName}-addContent${stageConfig.extension}`,
        ],
      }),
    );

    // Get environment variables
    const googleAccessToken =
      stageConfig.googleAccessToken || process.env.GOOGLE_ACCESS_TOKEN || "";
    const githubAccessToken =
      stageConfig.githubAccessToken || process.env.GITHUB_ACCESS_TOKEN || "";

    const commonEnv = {
      GITHUB_USERNAME: "DanielMuller",
      GITHUB_REPO: "mercredistes.mesphotos.ch",
      GITHUB_COMMIT_EMAIL: "mercredistes-scraper@mesphotos.ch",
      GITHUB_COMMIT_USER: "Mercredistes Scraper",
      stage: stage,
      default_photographer: "William Baehler",
      GOOGLE_ACCESS_TOKEN: googleAccessToken,
      GITHUB_ACCESS_TOKEN: githubAccessToken,
    };

    // Create log groups
    const addContentLogGroup = new logs.LogGroup(this, "AddContentLogGroup", {
      logGroupName: `/aws/lambda/${serviceName}-addContent${stageConfig.extension}`,
      retention: stageConfig.lambda.logRetention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const triggerAddContentLogGroup = new logs.LogGroup(
      this,
      "TriggerAddContentLogGroup",
      {
        logGroupName: `/aws/lambda/${serviceName}-triggerAddContent${stageConfig.extension}`,
        retention: stageConfig.lambda.logRetention,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    // Create the addContent Lambda function using NodeJSFunction
    const addContentFunction = new nodejs.NodejsFunction(
      this,
      "AddContentFunction",
      {
        entry: path.join(__dirname, "..", "src", "handlers", "addContent.ts"),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_24_X,
        role: lambdaRole,
        memorySize: stageConfig.lambda.memorySize,
        timeout: cdk.Duration.seconds(stageConfig.lambda.timeout),
        functionName: `${serviceName}-addContent${stageConfig.extension}`,
        environment: commonEnv,
        layers: [
          lambda.LayerVersion.fromLayerVersionArn(
            this,
            "GitLambda2Layer",
            layerArn,
          ),
        ],
        logGroup: addContentLogGroup,
        bundling: {
          minify: true,
          sourceMap: false,
          target: "es2021",
        },
      },
    );

    // Create the triggerAddContent Lambda function using NodeJSFunction
    const triggerAddContentFunction = new nodejs.NodejsFunction(
      this,
      "TriggerAddContentFunction",
      {
        entry: path.join(
          __dirname,
          "..",
          "src",
          "handlers",
          "triggerAddContent.ts",
        ),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_24_X,
        role: lambdaRole,
        memorySize: stageConfig.lambda.memorySize,
        timeout: cdk.Duration.seconds(stageConfig.lambda.timeout),
        functionName: `${serviceName}-triggerAddContent${stageConfig.extension}`,
        environment: {
          ...commonEnv,
          TRIGGER_TOKEN: process.env.TRIGGER_TOKEN || "",
          ADD_CONTENT_FUNCTION_NAME: addContentFunction.functionName,
        },
        layers: [
          lambda.LayerVersion.fromLayerVersionArn(
            this,
            "GitLambda2LayerTrigger",
            layerArn,
          ),
        ],
        logGroup: triggerAddContentLogGroup,
        bundling: {
          minify: true,
          sourceMap: false,
          target: "es2021",
        },
      },
    );

    // Grant triggerAddContent permission to invoke addContent
    addContentFunction.grantInvoke(triggerAddContentFunction);

    // Create EventBridge rule for scheduled trigger
    const eventRule = new events.Rule(this, "ScheduledRule", {
      schedule: events.Schedule.cron({
        minute: "25",
        hour: "4",
        month: "*",
        weekDay: "*",
        year: "*",
      }),
      enabled: true,
      ruleName: `${serviceName}-schedule${stageConfig.extension}`,
    });

    eventRule.addTarget(
      new targets.LambdaFunction(addContentFunction, {
        event: events.RuleTargetInput.fromObject({
          year: "2026",
        }),
      }),
    );

    // Create HTTP API
    const httpApi = new apigateway.HttpApi(this, "HttpApi", {
      apiName: `${serviceName}-api${stageConfig.extension}`,
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [apigateway.CorsHttpMethod.GET],
        allowHeaders: ["*"],
      },
    });

    // Add GET /build route
    httpApi.addRoutes({
      path: "/build",
      methods: [apigateway.HttpMethod.GET],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        "TriggerAddContentIntegration",
        triggerAddContentFunction,
      ),
    });

    // Output the API endpoint
    new cdk.CfnOutput(this, "HttpApiEndpoint", {
      value: httpApi.apiEndpoint || "N/A",
      description: "HTTP API endpoint URL",
    });

    // Output function names
    new cdk.CfnOutput(this, "AddContentFunctionName", {
      value: addContentFunction.functionName,
      description: "Name of the addContent Lambda function",
    });

    new cdk.CfnOutput(this, "TriggerAddContentFunctionName", {
      value: triggerAddContentFunction.functionName,
      description: "Name of the triggerAddContent Lambda function",
    });
  }
}
