#!/bin/bash

cp_cmd="cp .env.dev .env"
$cp_cmd

sls_offline="yarn sls offline"
env AWS_PROFILE=giboshi31 NODE_ENV=deevelopment $sls_offline &> app.log &

ngrok="ngrok http -subdomain=atoz 3000"
$ngrok