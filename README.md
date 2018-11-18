# architecture

You can see all endpoints and rousources in serverless.yml

## Webhook endpoint
`/webhook` endpoint receives POST request from LINE when the bot receive a event, such as receiving text message and followed by a new user

## Liff endpoint
`/liff` endpoint is supposed to be a link opened in LINE app with schema `liff://...` called LIne Frontend Framework

## SaveImage endpoint
`/saveImage` endpoint receives POST request from the liff app and save an image on S3 bucket

## triggeredBySavedImage function
This function is supposed to be executed when a new file is saved on the S3 bucket.

For now, this function is like a simple bridge function to just execute `sendNext` function.

## sendNext function
This function is executed by either `triggeredBySavedImage` or `/webhook` endpoint.

Note `/webhook` endpoint has to execute `sendNext` directly when a user is skipped, in order to propagate necessary process to next 'new' user.

This is one of core functions of this app.

# How to develop API
```
$ cp .env.sample .env.development
$ vim .env.development
$ yarn run dev
```

You can launch ngrok with the command and `serverless offline` process to receive webhook with LINE dev bot.

# How to deploy API to prod
```
$ cp .env.sample .env.production
$ vim .env.production
$ yarn run deploy-prod
```