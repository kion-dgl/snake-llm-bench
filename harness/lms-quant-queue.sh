#!/bin/bash
# Compare Q4 vs Q8 quants of gemma4-e2b and -e4b on the eGPU (via ollama ROCm)
set -uo pipefail
cd /home/kion/Github/ollma
exec >>/tmp/quant-queue.log 2>&1

echo
echo "============================================================"
echo "[$(date +%H:%M:%S)] quant-comparison queue starts"
echo "============================================================"

# GPU monitor in background
(while true; do
  ts=$(date +%H:%M:%S)
  c0=$(cat /sys/class/drm/card0/device/gpu_busy_percent 2>/dev/null)
  c1=$(cat /sys/class/drm/card1/device/gpu_busy_percent 2>/dev/null)
  echo "[mon $ts] eGPU=${c0}% iGPU=${c1}%"
  sleep 8
done) > /tmp/quant-monitor.log 2>&1 &
MON_PID=$!
trap "kill $MON_PID 2>/dev/null" EXIT

# Wait for all 4 pulls to finish (poll ollama list)
wait_for_pull() {
  local m="$1"
  while ! ollama list 2>/dev/null | awk '{print $1}' | grep -qx "$m"; do
    echo "[$(date +%H:%M:%S)] waiting for $m to finish pulling..."
    sleep 30
  done
}

for m in gemma4:e2b gemma4:e2b-it-q8_0 gemma4:e4b gemma4:e4b-it-q8_0; do
  wait_for_pull "$m"
done
echo "[$(date +%H:%M:%S)] all 4 quants downloaded"

for model in gemma4:e2b gemma4:e2b-it-q8_0 gemma4:e4b gemma4:e4b-it-q8_0; do
  echo
  echo "[$(date +%H:%M:%S)] === $model on eGPU (ROCm) ==="
  # use a label to keep dirnames distinct from any prior runs
  slug="${model//:/_}__full"
  PROVIDER=ollama bun harness/round2.ts --model "$model" 2>&1
done

echo
echo "[$(date +%H:%M:%S)] quant queue complete"
