import { env } from '../config/env.js';

export function authDebug(message, details = {}) {
  if (!env.AUTH_DEBUG) {
    return;
  }

  console.debug('[auth]', message, details);
}
