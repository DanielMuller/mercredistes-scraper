import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambda = new LambdaClient({});
const TOKEN = process.env.TRIGGER_TOKEN;
const LAMBDA_FUNCTION_NAME = process.env.ADD_CONTENT_FUNCTION_NAME;

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const token = event.queryStringParameters?.token;

  if (token !== TOKEN) {
    return {
      statusCode: 400,
      body: "<html><body><p>Invalid token</p></body></html>",
    };
  }

  const now = new Date();
  const redirectUrl = `https://${event.headers.host}${event.rawPath}?token=${TOKEN}&timestamp=${now.getTime()}`;

  try {
    await lambda.send(
      new InvokeCommand({
        FunctionName: LAMBDA_FUNCTION_NAME,
        InvocationType: "Event",
      }),
    );

    return redirectResponse(event);
  } catch (err) {
    console.error("Lambda invocation error:", err);
    return {
      statusCode: 400,
      body: "<html><body><p>Error triggering build</p></body></html>",
    };
  }
};

const redirectResponse = (
  event: APIGatewayProxyEventV2,
): APIGatewayProxyResultV2 => {
  const now = new Date();
  const redirectUrl = `https://${event.headers.host}${event.rawPath}?token=${TOKEN}&timestamp=${now.getTime()}`;

  return {
    statusCode: 202,
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
    },
    body: `<html><body><h1>Build triggered</h1><p>La construction du site est en cours de traitement. Redirection en cours...</p><meta http-equiv="refresh" content="5;url=${redirectUrl}" /></body></html>`,
  };
};
