# Mercredistes Scraper
Lambda functions that fetches the latest entries in a Google Spreadsheet and pushes updates to a [Hugo](https://gohugo.io) data set in [git](https://github.com/DanielMuller/mercredistes.mesphotos.ch).

### Configuration
Edit *config/dev.yml* and *config/production.yml* to suit your needs.

Run `nvm use` to load the right node version and `npm install` to install all the dependencies.

## Deploy
`sls deploy` (development) or `sls -s production deploy`

### Webpack
Webpack will automatically bundle only the used dependencies and create a unique and smaller bundle for each function.

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
