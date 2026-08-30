#!/bin/bash
# usage: ./fetch.sh <outfile> <path>
T=$(cat "$(dirname "$0")/.token")
out="$1"; shift
code=$(curl -s -o "$out" -w '%{http_code}' -H "Authorization: Bearer $T" "http://localhost/v1/$1")
echo "GET /v1/$1 -> HTTP $code -> $out"
