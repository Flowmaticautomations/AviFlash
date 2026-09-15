// Plain-Node self-check for isImageDataValid() -- run with
// `node lib/imageValidation.test.ts`. Guards the exact regression from the
// 2026-09-10 device test: every upload silently landed as an identical
// 14-byte object instead of throwing. This is the one guard that would
// have caught it before it ever reached storage.
import assert from 'node:assert/strict';
import { isImageDataValid, MIN_VALID_IMAGE_BYTES } from './imageValidation.ts';

let passed = 0;
function check(name: string, actual: boolean, expected: boolean) {
  assert.equal(actual, expected, `${name}: expected ${expected}, got ${actual}`);
  passed++;
}

check('0 bytes (fetch()/arrayBuffer() failure) rejected', isImageDataValid(0), false);
check('14 bytes (the actual corrupt-upload size seen in testing) rejected', isImageDataValid(14), false);
check('just under the threshold rejected', isImageDataValid(MIN_VALID_IMAGE_BYTES - 1), false);
check('right at the threshold accepted', isImageDataValid(MIN_VALID_IMAGE_BYTES), true);
check('a real compressed photo size accepted', isImageDataValid(45_000), true);

console.log(`isImageDataValid self-check: ${passed} passed`);
