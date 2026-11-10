/* In-memory per-type SMS drafts. One draft per message type, kept for the
session so switching rows or filters never loses typed text. */

const store = new Map<string, string>();

export function getSmsDraft(messageType: string, fallback = ''): string {
  return store.get(messageType) ?? fallback;
}

export function setSmsDraft(messageType: string, value: string): void {
  store.set(messageType, value);
}

export function clearSmsDraft(messageType: string): void {
  store.delete(messageType);
}

export function clearAllSmsDrafts(): void {
  store.clear();
}
