# Mercredistes Scraper
Lambda functions that fetches the latest entries in a Google Spreadsheet and pushes updates to a [Hugo](https://gohugo.io) data set in [git](https://github.com/DanielMuller/mercredistes.mesphotos.ch).

## Setup
Run the following once after cloning:

```bash
nvm use
npm install
```

## Configuration
Stage-specific infrastructure config is defined in cdk.json under:

- dev
- production
- test

Runtime secrets and tokens are read from environment variables.

## Deploy (AWS CDK)
This project deploys with AWS CDK (not Serverless Framework).

### 1. Export required environment variables

```bash
export AWS_ACCOUNT_ID=123456789012
export GITHUB_ACCESS_TOKEN=...
export GOOGLE_ACCESS_TOKEN=...
export TRIGGER_TOKEN=...
```

Optional overrides:

```bash
export GITHUB_USERNAME=DanielMuller
export GITHUB_REPO=mercredistes.mesphotos.ch
export GITHUB_COMMIT_EMAIL=mercredistes-scraper@mesphotos.ch
export GITHUB_COMMIT_USER="Mercredistes Scraper"
```

### 2. Bootstrap CDK (one-time per account/region)

```bash
npx cdk bootstrap aws://$AWS_ACCOUNT_ID/eu-central-1
```

### 3. Validate before deploy

```bash
npm run lint
npx tsc --noEmit
npm run cdk:synth -- --context stage=test
```

### 4. Deploy to a stage

Development:

```bash
npm run cdk:dev
```

Production:

```bash
npm run cdk:deploy
```

Test:

```bash
npm run cdk:test
```

### 5. Useful commands

```bash
# Compare local stack with deployed stack
npm run cdk:diff -- --context stage=dev

# Synthesize CloudFormation for a specific stage
npm run cdk:synth -- --context stage=production
```

Note: the stage is passed as CDK context using --context stage=<name>, not --stage.
