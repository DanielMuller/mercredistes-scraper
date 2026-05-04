# Mercredistes Scraper
Lambda functions that fetches the latest entries in a Google Spreadsheet and pushes updates to a [Hugo](https://gohugo.io) data set in [git](https://github.com/DanielMuller/mercredistes.mesphotos.ch).

### Configuration
Edit *config/dev.yml* and *config/production.yml* to suit your needs.

Run `nvm use` to load the right node version and `npm install` to install all the dependencies.

## Deploy
Serverless Framework v4 requires authentication before deploy/package commands.
Run `npx sls login` once locally, or set `SERVERLESS_ACCESS_KEY` (CI) / `SERVERLESS_LICENSE_KEY` in your environment.

Use `sls deploy --stage dev` (development) or `sls deploy --stage production`.

### Esbuild
Serverless Framework v4 built-in esbuild bundles only used dependencies and creates a smaller bundle for each function.

## Logging
[lambda-log](https://www.npmjs.com/package/lambda-log) provides a more structured way of logging:
```javascript
const log = require('lambda-log')
log.info('Log Tag', {key1: value1, key2: value2})
```
Which will result in:
```
{"_logLevel":"info","msg":"Log Tag","key1":"value1","key2":"value2","_tags":["log","info"]}
```
You can also add meta data by default:
```
log.options.meta.fct = 'fctName'
log.options.meta.requestId = event.requestContext.requestId
log.options.meta.path = event.path
log.options.meta.sourceIp = event.requestContext.identity.sourceIp
```
