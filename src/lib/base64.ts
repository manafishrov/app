// Keeps each String.fromCodePoint call well below engine argument limits.
const CHUNK_BYTES = 0x80_00;

type NativeBase64 = { toBase64?: () => string };

/** Base64 for large byte arrays, natively where the webview supports it. */
export const encodeBase64 = (bytes: Uint8Array): string => {
  const { toBase64 } = bytes as Uint8Array & NativeBase64;
  if (typeof toBase64 === 'function') {
    return toBase64.call(bytes);
  }
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += CHUNK_BYTES) {
    chunks.push(String.fromCodePoint(...bytes.subarray(offset, offset + CHUNK_BYTES)));
  }
  return btoa(chunks.join(''));
};
