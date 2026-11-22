import { describe, expect, it } from 'vitest';

import { encodeBase64 } from './base64';

// Larger than one fallback chunk and not a multiple of three, so padding is used.
const FRAME_BYTES = 100_001;
const BYTE_VALUES = 256;
const MAX_BYTE = 255;
const ASCII_M = 77;
const ASCII_A = 97;
const ASCII_N = 110;

const encodeWithoutNative = (bytes: Uint8Array): string =>
  encodeBase64(Object.defineProperty(bytes, 'toBase64', { value: null }));

describe('base64 encoding', () => {
  it('encodes large frames without the native encoder', () => {
    const bytes = Uint8Array.from({ length: FRAME_BYTES }, (_, index) => index % BYTE_VALUES);
    const expected = btoa(Array.from(bytes, (byte) => String.fromCodePoint(byte)).join(''));

    expect(encodeWithoutNative(bytes)).toBe(expected);
    expect(encodeWithoutNative(Uint8Array.of(ASCII_M, ASCII_A, ASCII_N))).toBe('TWFu');
    expect(encodeWithoutNative(Uint8Array.of(MAX_BYTE, 0))).toBe('/wA=');
    expect(encodeWithoutNative(new Uint8Array())).toBe('');
  });

  it('uses the native encoder when the webview has one', () => {
    const bytes = Object.defineProperty(new Uint8Array(1), 'toBase64', {
      value: (): string => 'native',
    });

    expect(encodeBase64(bytes)).toBe('native');
  });
});
