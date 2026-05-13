#!/bin/bash
# Overnight queue: run gemma-4 family on LM Studio.
# Waits for any in-progress bun round2.ts run, then waits for downloads,
# then sequentially load → round2 → unload for each model.

set -uo pipefail

cd "$(dirname "$0")/.."

LOG=/tmp/lms-queue.log
exec >>"$LOG" 2>&1

echo "[$(date +%H:%M:%S)] queue started, pid=$$"

wait_for_no_round2() {
  while pgrep -f "bun harness/round2.ts" >/dev/null; do
    sleep 30
  done
}

wait_for_model_on_disk() {
  local model="$1"
  while ! lms ls 2>/dev/null | grep -q "${model}"; do
    sleep 20
  done
}

run_model() {
  local model="$1"
  echo
  echo "============================================================"
  echo "[$(date +%H:%M:%S)] === $model ==="
  echo "============================================================"
  echo "[$(date +%H:%M:%S)] unloading any loaded models..."
  lms unload --all 2>&1 | tail -2 || true
  sleep 2
  echo "[$(date +%H:%M:%S)] loading $model with --gpu max..."
  if ! lms load "$model" --gpu max 2>&1 | tail -3; then
    echo "[$(date +%H:%M:%S)] FAILED to load $model, skipping"
    return 1
  fi
  echo "[$(date +%H:%M:%S)] running round 2..."
  PROVIDER=lmstudio bun harness/round2.ts --model "$model" 2>&1
  echo "[$(date +%H:%M:%S)] done with $model"
}

echo "[$(date +%H:%M:%S)] waiting for any in-progress round2 runs to finish..."
wait_for_no_round2
echo "[$(date +%H:%M:%S)] no more round2 runs in flight"

# Make sure each model is on disk before we try to load it (downloads are running in parallel)
for model in google/gemma-4-e2b google/gemma-4-e4b google/gemma-4-26b-a4b; do
  echo "[$(date +%H:%M:%S)] confirming $model is downloaded..."
  wait_for_model_on_disk "$model"
done

# Small models first so we get early signal
for model in google/gemma-4-e2b google/gemma-4-e4b google/gemma-4-26b-a4b; do
  run_model "$model" || true
done

# Final cleanup
lms unload --all 2>&1 | tail -2 || true
echo
echo "[$(date +%H:%M:%S)] queue complete"
