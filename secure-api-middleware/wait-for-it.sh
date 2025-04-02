#!/bin/bash
# wait-for-it.sh: Wait for a service to be ready

WAITFORIT_cmdname=${0##*/}
WAITFORIT_timeout=15
WAITFORIT_start_ts=$(date +%s)
WAITFORIT_host="$1"
WAITFORIT_port="$2"
shift 2

echo "Waiting for ${WAITFORIT_host}:${WAITFORIT_port}..."

until nc -z "$WAITFORIT_host" "$WAITFORIT_port"; do
  WAITFORIT_end_ts=$(date +%s)
  WAITFORIT_diff=$(( WAITFORIT_end_ts - WAITFORIT_start_ts ))
  
  if [ "$WAITFORIT_diff" -gt "$WAITFORIT_timeout" ]; then
    echo "Timeout reached, proceeding anyway..."
    break
  fi
  
  sleep 1
done

echo "${WAITFORIT_host}:${WAITFORIT_port} is available"
exec "$@" 