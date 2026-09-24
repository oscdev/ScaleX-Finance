/**
 * Client-safe unexpected error helpers.
 * Known domain / validation errors must keep their existing status, code, and message.
 * Only unexpected failures use the generic client message; full detail stays in server logs.
 */

export const UNEXPECTED_CLIENT_MESSAGE = 'An unexpected error occurred';

/** Message safe to return to HTTP clients for unexpected (non-domain) failures. */
export function safeUnexpectedMessage(): string {
  return UNEXPECTED_CLIENT_MESSAGE;
}
