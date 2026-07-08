#!/bin/bash
set -euo pipefail

if [ -z "$1" ]; then
    echo "Error: input argument is required."
    exit 1
fi

readonly INPUT_FILE=$1
readonly OUTPUT_NAME="${INPUT_FILE%.*}.gif"
echo "$OUTPUT_NAME"

readonly PALETTE=palette.png
trap 'rm -f "$PALETTE"' EXIT

ffmpeg -y -i "$INPUT_FILE" -vf "palettegen" -frames:v 1 -update 1 "$PALETTE"
ffmpeg -y -i "$INPUT_FILE" -i "$PALETTE" -lavfi "[0:v][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" "$OUTPUT_NAME"

rm -f "$PALETTE"
