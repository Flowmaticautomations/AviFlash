// Pure, dependency-free on purpose (like access.ts) so it can be self-checked
// with plain `node`, unlike imageUpload.ts which pulls in RN/Expo native
// modules that only resolve under Metro.

// A real (even fully degenerate 1x1) JPEG is never this small -- anything
// under this size means the local file read silently failed rather than
// producing a genuine photo. This exact threshold is what would have caught
// the 14-byte corrupt uploads seen in the 2026-09-10 device test.
export const MIN_VALID_IMAGE_BYTES = 100;

export function isImageDataValid(byteLength: number): boolean {
  return byteLength >= MIN_VALID_IMAGE_BYTES;
}
