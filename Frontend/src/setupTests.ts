/* eslint-disable @typescript-eslint/no-require-imports */
import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for jsdom
if (typeof globalThis.TextEncoder === 'undefined') {
  // @ts-expect-error - require is available in Jest/Node environment
  const util = require('util');
  globalThis.TextEncoder = util.TextEncoder;
  globalThis.TextDecoder = util.TextDecoder;
}