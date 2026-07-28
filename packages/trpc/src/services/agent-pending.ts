export type PendingToolCall = {
  id: string;
  userId: string;
  tool: string;
  args: Record<string, unknown>;
  title: string;
  expiresAt: number;
};

const TTL_MS = 15 * 60 * 1000;
const store = new Map<string, PendingToolCall>();

function prune() {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expiresAt <= now) store.delete(id);
  }
}

export function storePendingConfirmation(input: {
  userId: string;
  tool: string;
  args: Record<string, unknown>;
  title: string;
}): PendingToolCall {
  prune();
  const id = crypto.randomUUID();
  const entry: PendingToolCall = {
    id,
    userId: input.userId,
    tool: input.tool,
    args: input.args,
    title: input.title,
    expiresAt: Date.now() + TTL_MS,
  };
  store.set(id, entry);
  return entry;
}

export function takePendingConfirmation(
  id: string,
  userId: string,
): PendingToolCall | null {
  prune();
  const entry = store.get(id);
  if (!entry || entry.userId !== userId) return null;
  store.delete(id);
  if (entry.expiresAt <= Date.now()) return null;
  return entry;
}

export function cancelPendingConfirmation(id: string, userId: string): boolean {
  const entry = store.get(id);
  if (!entry || entry.userId !== userId) return false;
  store.delete(id);
  return true;
}
