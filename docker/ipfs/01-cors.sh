#!/bin/sh
# 01-cors.sh — Configure CORS for IPFS Kubo node
set -e

echo "Configuring IPFS API and Gateway CORS..."

ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET", "OPTIONS"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Headers '["Authorization", "Content-Type", "X-Stream-Output", "X-Chunked-Output", "X-Stream-Error"]'

ipfs config --json Gateway.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs config --json Gateway.HTTPHeaders.Access-Control-Allow-Methods '["GET", "POST", "OPTIONS"]'
ipfs config --json Gateway.HTTPHeaders.Access-Control-Allow-Headers '["Content-Type", "Range", "User-Agent", "X-Requested-With"]'

echo "IPFS CORS configuration complete."
