# Opening web assets

These are browser delivery copies of the selected sources in `frontend-sources/opening-assets/v1`. Original source IDs, generation prompts and SHA-256 values are recorded in that folder's `assets-manifest.json`.

## Images

D01–D06: supplied desktop illustrations. M01–M06: generated portrait recompositions. B01/B02: supplied transparent balloon artwork. S01–S05: generated supplementary artwork. P01/P02/P03/P09/P11/P18: supplied real photos.

Exported with FFmpeg/libwebp, quality 82, compression level 6, preserving aspect ratio and alpha. Width is limited to 1600px and height to 1700px, without upscaling. The photos are delivery-size copies; originals remain unchanged. The selected 25 WebP images total approximately 1.47MiB.

The runtime uses B01 for the main balloon and B02 for the foreground wipe. S01 is a soft-edged alternative kept with the selected reference package.

## Music

`return-to-115.m4a` is the AAC audio stream copied from the user-supplied `P6 - 2021 原来音乐都记得.mp4` (NetEase annual-report collection). The supplied file contains an audio stream only. Duration: approximately 210.432 seconds; size: approximately 2.45MiB.

Extraction: `ffmpeg -i INPUT -map 0:a:0 -c:a copy -movflags +faststart return-to-115.m4a`.

The audio is requested after the visitor clicks Start, at a controlled volume. It is optional and is paused when the story is paused or hidden.
