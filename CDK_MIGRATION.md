# AWS CDK Migration Guide

This document outlines the migration from **Serverless Framework v4** to **AWS CDK (TypeScript)**.

## Overview

The infrastructure has been migrated from Serverless Framework YAML configuration to AWS CDK Infrastructure-as-Code (IaC). The CDK approach provides:

- **Type-safe infrastructure** - TypeScript ensures compile-time correctness
- **Programmatic flexibility** - Define infrastructure using code constructs
- **Better composability** - Reuse components across stacks
- **Consistent deployments** - Same CloudFormation under the hood as Serverless Framework

## Project Structure

```
├── cdk.ts                 # CDK App entry point
├── cdk.json              # CDK configuration with stage contexts
├── tsconfig.json         # TypeScript configuration
├── lib/
│   └── stack.ts          # Main CDK Stack definition
├── services/             # Lambda handler code (unchanged)
│   ├── addContent.js
│   ├── triggerAddContent.js
├── package.json          # Updated with CDK dependencies
└── .cdkignore            # Files to exclude from Lambda assets
```

## Key Differences from Serverless Framework

### Configuration

**Serverless Framework:**
```yaml
# serverless.yml
provider:
  name: aws
  runtime: nodejs24.x
  region: eu-central-1

custom:
  stage: ${file(stages/${opt:stage}.yml)}
```

**AWS CDK:**
```typescript
// cdk.json - Contexts for each stage
{
  "context": {
    "dev": {
      "region": "eu-central-1",
      "accountId": "${env:AWS_ACCOUNT_ID}",
      ...
    }
  }
}

// cdk.ts - App entry point
const stageConfig = app.node.tryGetContext(stage);
new MercredistesScraperStack(app, `stack-${stage}`, {
  stage,
  stageConfig,
  env: { account, region }
});
```

### Function Definition

**Serverless Framework:**
```yaml
# services/addContent.yml
handler: services/addContent.handler
memorySize: 2048
timeout: 900
layers:
  - arn:aws:lambda:...
events:
  - schedule: cron(25 4 * * ? *)
```

**AWS CDK:**
```typescript
// lib/stack.ts
const addContentFunction = new lambda.Function(this, 'AddContentFunction', {
  handler: 'services/addContent.handler',
  memorySize: stageConfig.lambda.memorySize,
  timeout: cdk.Duration.seconds(stageConfig.lambda.timeout),
  layers: [lambda.LayerVersion.fromLayerVersionArn(...)],
});

// EventBridge rule
const eventRule = new events.Rule(this, 'ScheduledRule', {
  schedule: events.Schedule.cron({
    minute: '25', hour: '4', month: '*', weekDay: '*', year: '*'
  }),
});
eventRule.addTarget(new targets.LambdaFunction(addContentFunction));
```

## Deployment Commands

### Deploy CDK Stack

```bash
# Test stage (local/credential-free)
npm run cdk:test

# Dev stage
npm run cdk:dev

# Production stage
npm run cdk:deploy

# Or manually with explicit stage
npx cdk deploy --context stage=production
```

### Validate Changes

```bash
# Synthesize (generate CloudFormation template)
npm run cdk:synth -- --context stage=test

# Compare with AWS
npm run cdk:diff -- --context stage=dev

# View generated template
cat cdk.out/mercredistes-scraper-test.template.json
```

## Stage Management

Stages are configured in `cdk.json` under the `context` key:

- **test**: Credential-free stage with placeholder tokens and dummy account ID (000000000000)
- **dev**: Development stage using AWS profile "mesphotos"
- **production**: Production stage using AWS profile "mesphotos"

### Environment Variable Resolution

The CDK app automatically resolves environment variables in account IDs:

```typescript
// cdk.json defines accountId as: "${env:AWS_ACCOUNT_ID}"
// cdk.ts resolves this at runtime:
let accountId = process.env.AWS_ACCOUNT_ID || "000000000000" (for test);
```

## Lambda Asset Bundling

CDK automatically excludes unnecessary files when bundling Lambda code:

```typescript
code: lambda.Code.fromAsset(path.join(__dirname, '..'), {
  exclude: [
    '.git', 'node_modules', 'cdk.out', '.git', 'serverless.yml',
    'stages', 'config', 'events', 'cdk.ts', 'cdk.json', // ...
  ],
}),
```

The `.cdkignore` file complements this by telling CDK which files to skip during asset preparation.

## Infrastructure Components

### Lambda Functions

1. **addContent** - Scheduled Lambda that scrapes content
   - Memory: 2048 MB
   - Timeout: 900 seconds
   - Trigger: EventBridge cron (4:25 AM daily)
   - Layer: git-lambda2:8 (Node.js utilities)

2. **triggerAddContent** - HTTP API endpoint
   - Memory: 2048 MB
   - Timeout: 900 seconds
   - Trigger: HTTP API GET /build
   - Layer: git-lambda2:8

### EventBridge

- **Schedule**: `cron(25 4 * * ? *)` (daily at 4:25 AM UTC)
- **Target**: addContent Lambda function with input `{ year: "2026" }`

### HTTP API

- **Endpoint**: GET /build
- **Handler**: triggerAddContent Lambda
- **CORS**: Allowed from all origins

### IAM

- Single execution role with permissions for:
  - CloudWatch Logs (CreateLogGroup, CreateLogStream, PutLogEvents)
  - Lambda invocation (for triggerAddContent to invoke addContent)

## Environment Variables

Both Lambda functions have the same environment configuration:

```
GOOGLE_ACCESS_TOKEN         # From stage config or ${GOOGLE_ACCESS_TOKEN} env
GITHUB_ACCESS_TOKEN         # From stage config or ${GITHUB_ACCESS_TOKEN} env
GITHUB_USERNAME             # DanielMuller
GITHUB_REPO                 # mercredistes.mesphotos.ch
GITHUB_COMMIT_EMAIL         # mercredistes-scraper@mesphotos.ch
GITHUB_COMMIT_USER          # Mercredistes Scraper
stage                       # dev/production/test
default_photographer       # William Baehler
```

## Migrating from Serverless Framework

If reverting back to Serverless Framework, keep `serverless.yml` in the repo. CDK coexists with Serverless Framework configuration but deployment should use ONE tool at a time to avoid conflicts.

### Switching to Serverless Framework:
```bash
# Deploy with Serverless Framework
npm run deploy         # production
npm run dev            # dev stage
```

### Switching to CDK:
```bash
# Deploy with CDK
npm run cdk:deploy     # production
npm run cdk:dev        # dev stage
```

## Outputs

CDK stack outputs are defined in `lib/stack.ts`:

```
HttpApiEndpoint           - URL to the HTTP API
AddContentFunctionName    - Name of addContent Lambda
TriggerAddContentFunctionName - Name of triggerAddContent Lambda
```

These appear in CloudFormation Outputs section after stack creation.

## Testing

### Local Testing (Credential-free)

```bash
# Synthesize for test stage
npm run cdk:synth -- --context stage=test

# View generated template
cat cdk.out/mercredistes-scraper-test.template.json
```

### Validate TypeScript

```bash
# Lint and type-check
npm run lint
```

## Troubleshooting

### Account ID Not Set
```
Error: Account ID must be set for stage "dev". Set AWS_ACCOUNT_ID environment variable.
```

**Solution**: Set environment variable before deploying:
```bash
export AWS_ACCOUNT_ID=123456789012
npm run cdk:deploy
```

### CloudFormation Deployment Fails
If CDK deployment fails due to CloudFormation errors:
1. Check AWS CloudFormation console for stack events
2. Ensure AWS credentials are valid: `aws sts get-caller-identity`
3. Verify IAM permissions for Lambda, EventBridge, API Gateway, IAM creation

### Synthesize Errors
If `cdk synth` fails:
1. Ensure TypeScript compiles: `npx tsc --noEmit`
2. Check Node.js version: `node --version` (should be 24.x)
3. Validate cdk.json context: `cat cdk.json | jq '.context'`

## Migration Checklist

- [x] Create TypeScript CDK project structure
- [x] Migrate Lambda function definitions
- [x] Migrate EventBridge rule configuration
- [x] Migrate HTTP API configuration
- [x] Migrate IAM permissions
- [x] Migrate environment variables and stage configuration
- [x] Test CDK synthesis for all stages
- [x] Verify Lambda asset bundling
- [x] Update package.json with CDK commands
- [ ] Deploy to AWS and test in dev stage (pending)
- [ ] Validate production deployment (pending)
- [ ] Archive Serverless Framework config as backup

## Next Steps

1. **Deploy to AWS**:
   ```bash
   export AWS_ACCOUNT_ID=<your-account>
   npm run cdk:deploy -- --context stage=production
   ```

2. **Validate Deployment**:
   - Check Lambda functions in AWS Console
   - Test HTTP API endpoint
   - Monitor EventBridge rule execution
   - Review CloudWatch Logs

3. **Keep Serverless Framework** (optional):
   - Keep `serverless.yml` in version control for reference
   - Consider removing it later if CDK proves stable

## References

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/home.html)
- [CDK TypeScript Guide](https://docs.aws.amazon.com/cdk/latest/guide/work_with_cdk_typescript.html)
- [CDK API Reference](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-construct-library.html)
