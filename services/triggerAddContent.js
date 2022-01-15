'use strict'
const AWS = require('aws-sdk')
const lambda = new AWS.Lambda({ region: process.env.AWS_REGION })

exports.handler = async function (event, context) {
  if (!event.queryStringParameters) {
    return redirectResponse(event)
  }
  if (!event.queryStringParameters.token) {
    return redirectResponse(event)
  }
  if (event.requestContext.timeEpoch - parseInt(event.queryStringParameters.token) > 1000) {
    return {
      statusCode: 403,
      headers: {
        'content-type': 'text/plain'
      },
      body: 'Access Denied'
    }
  }
  const payload = {
    year: process.env.year
  }
  const params = {
    FunctionName: process.env.functionName,
    InvocationType: 'Event',
    Payload: JSON.stringify(payload)
  }
  const invoke = await lambda.invoke(params).promise()
  console.log(invoke)

  return {
    statusCode: 202,
    headers: {
      'content-type': 'text/html; charset=utf-8'
    },
    body
  }
}

const body = `<html>
<head>
  <title>Requête reçue</title>
<style>
html {
  font-size:2em;
  margin: 2em;
}
</style>
</head>
<body>
La requête de mise à jour a été reçue.<br>
Les nouveaux albums seront visibles sur <a href="https://mercredistes.mesphotos.ch">https://mercredistes.mesphotos.ch</a> dans quelques minutes.
<br><br>
Vous pouvez également vérifier la progression sur un des sites suivants:
<ul>
<li><a href="https://github.com/DanielMuller/mercredistes.mesphotos.ch/commits/master" target="_github">Github commits</a></li>
<li><a href="https://app.netlify.com/sites/cocky-leavitt-fa55b3/deploys?filter=master" target="_netlify">Netlify build</a></li>
</ul>
</body>
</html>
`

const redirectResponse = (event) => {
  const location = `https://${event.headers.host}${event.rawPath}?token=${new Date().getTime()}`
  return {
    statusCode: 307,
    headers: {
      location
    }
  }
}
