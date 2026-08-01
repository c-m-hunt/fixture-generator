#!/bin/bash
#
# Retry fixture generation until a solution is found (or max attempts reached)
#
# Usage: ./scripts/retry_until_solution.sh [max_attempts]
#

MAX_ATTEMPTS=${1:-100}
ATTEMPT=1

echo "Starting fixture generation with up to ${MAX_ATTEMPTS} attempts..."
echo ""

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "========================================"
    echo "Attempt ${ATTEMPT} of ${MAX_ATTEMPTS}"
    echo "========================================"
    echo ""

    # Run the command and capture output
    OUTPUT=$(uv run python main.py 2>&1)

    # Check if the failure message is NOT in the output
    if ! echo "$OUTPUT" | grep -q "No solution found with either approach!"; then
        echo "$OUTPUT"
        echo ""
        echo "========================================"
        echo "✓ SUCCESS on attempt ${ATTEMPT}!"
        echo "========================================"
        exit 0
    else
        echo "✗ No solution found on attempt ${ATTEMPT}"
        echo ""
    fi

    ATTEMPT=$((ATTEMPT + 1))
done

echo "========================================"
echo "❌ FAILED after ${MAX_ATTEMPTS} attempts"
echo "========================================"
exit 1
