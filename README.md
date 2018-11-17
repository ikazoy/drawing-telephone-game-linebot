# How to develop
```
$ cp .env.sample .env.development
$ vim .env.development
$ yarn run dev
```

You can launch ngrok with the command and `serverless offline` process to receive webhook with LINE dev bot.

# How to deploy to prod
```
$ cp .env.sample .env.production
$ vim .env.production
$ yarn run deploy-prod
```