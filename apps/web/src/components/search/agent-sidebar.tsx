"use client";

import {
  ArrowUp,
  Check,
  History,
  Loader2,
  Plus,
  Square,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { SearchWorkspaceState } from "@/components/search/search-intents";

export interface AgentSearchAction {
  type: "search";
  zip?: string;
  city?: string;
  state?: string;
  areaMode?: "zip" | "city" | "county";
  intent?: SearchWorkspaceState["intent"];
  minPrice?: string;
  maxPrice?: string;
}

type AgentMode = "ask" | "agent";

interface PendingConfirmation {
  id: string;
  title: string;
  tool: string;
  args: Record<string, unknown>;
}

interface ToolTraceItem {
  name: string;
  ok: boolean;
  summary: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolTrace?: ToolTraceItem[];
  pendingConfirmations?: PendingConfirmation[];
}

const STORAGE_KEY = "aurora-search-agent-chat-v1";

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Agent ready. Ask me to search markets or inspect your CRM — e.g. **Find vacant homes in 85016** or **Summarize my pipeline**.",
};

function renderMarkdownLite(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-[var(--cursor-agent-fg)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function loadStoredMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [WELCOME];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [WELCOME];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [WELCOME];
  } catch {
    return [WELCOME];
  }
}

export function AgentSidebar({
  open,
  onClose,
  searchState,
  resultCount,
  onSearchAction,
  className,
}: {
  open: boolean;
  onClose?: () => void;
  searchState: SearchWorkspaceState;
  resultCount?: number;
  onSearchAction: (action: AgentSearchAction) => void;
  className?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<AgentMode>("agent");
  const [hydrated, setHydrated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useUtils();

  useEffect(() => {
    setMessages(loadStoredMessages());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore quota */
    }
  }, [messages, hydrated]);

  function applyUiActions(actions: AgentSearchAction[]) {
    for (const action of actions) {
      if (action.type === "search") onSearchAction(action);
    }
  }

  async function invalidateCrmCaches() {
    await Promise.all([
      utils.lead.list.invalidate(),
      utils.pipeline.listBoard.invalidate(),
      utils.deal.list.invalidate(),
      utils.buyer.list.invalidate(),
      utils.campaign.list.invalidate(),
      utils.billing.getUsage.invalidate(),
    ]);
  }

  const chat = trpc.agent.chat.useMutation({
    onSuccess: async (data) => {
      const uiActions = (data.uiActions ?? []) as AgentSearchAction[];
      applyUiActions(uiActions);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.message,
          toolTrace: data.toolTrace ?? [],
          pendingConfirmations: (data.pendingConfirmations ??
            []) as PendingConfirmation[],
        },
      ]);
      if (
        (data.toolTrace ?? []).some((t) =>
          /^(create_|move_|update_|add_|complete_|enroll_|send_|publish_|blast_)/.test(
            t.name,
          ),
        )
      ) {
        await invalidateCrmCaches();
      }
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: `Something went wrong: ${err.message}`,
        },
      ]);
    },
  });

  const confirmMut = trpc.agent.confirm.useMutation({
    onSuccess: async (data, vars) => {
      applyUiActions((data.uiActions ?? []) as AgentSearchAction[]);
      setMessages((prev) => {
        const cleared = prev.map((m) => ({
          ...m,
          pendingConfirmations: m.pendingConfirmations?.filter(
            (c) => c.id !== vars.confirmationId,
          ),
        }));
        return [
          ...cleared,
          {
            id: `c-${Date.now()}`,
            role: "assistant",
            content: data.message,
            toolTrace: data.toolTrace ?? [],
          },
        ];
      });
      if (vars.approved) await invalidateCrmCaches();
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chat.isPending, confirmMut.isPending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  function newChat() {
    setMessages([WELCOME]);
    setDraft("");
    chat.reset();
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  function send() {
    const content = draft.trim();
    if (!content || chat.isPending) return;

    const forUi: ChatMessage[] =
      messages[0]?.id === "welcome" && messages.length === 1
        ? [{ id: `u-${Date.now()}`, role: "user", content }]
        : [
            ...messages.filter((m) => m.id !== "welcome"),
            { id: `u-${Date.now()}`, role: "user", content },
          ];

    setMessages(forUi);
    setDraft("");

    chat.mutate({
      mode,
      messages: forUi.map((m) => ({ role: m.role, content: m.content })),
      context: {
        zip: searchState.zip || undefined,
        city: searchState.city || undefined,
        state: searchState.state || undefined,
        intent: searchState.intent,
        areaMode: searchState.areaMode,
        resultCount,
      },
    });
  }

  if (!open) return null;

  return (
    <aside
      className={cn(
        "cursor-agent flex h-full min-h-0 w-full flex-col",
        className,
      )}
    >
      <div className="cursor-agent-header flex h-11 shrink-0 items-center gap-0.5 px-2.5">
        <div className="flex min-w-0 items-center gap-2 px-1">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--cursor-agent-accent)]/20 text-[10px] font-bold text-[var(--cursor-agent-accent)]">
            A
          </span>
          <span className="truncate text-[13px] font-medium text-[var(--cursor-agent-fg)]">
            Agent
          </span>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          title="History"
          className="rounded-md p-1.5 text-[var(--cursor-agent-muted)] transition hover:bg-white/[0.06] hover:text-[var(--cursor-agent-fg)]"
        >
          <History className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="New chat"
          onClick={newChat}
          className="rounded-md p-1.5 text-[var(--cursor-agent-muted)] transition hover:bg-white/[0.06] hover:text-[var(--cursor-agent-fg)]"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        {onClose && (
          <button
            type="button"
            title="Close"
            onClick={onClose}
            className="rounded-md p-1.5 text-[var(--cursor-agent-muted)] transition hover:bg-white/[0.06] hover:text-[var(--cursor-agent-fg)] lg:hidden"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="cursor-agent-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="mx-auto flex max-w-[720px] flex-col gap-5">
          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end">
                <div className="cursor-agent-msg-user max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.55] text-[var(--cursor-agent-fg)]">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex gap-2.5">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--cursor-agent-accent)]/15 text-[10px] font-bold text-[var(--cursor-agent-accent)]">
                  A
                </div>
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="whitespace-pre-wrap text-[13px] leading-[1.55] text-[var(--cursor-agent-fg)]/95">
                    {renderMarkdownLite(msg.content)}
                  </div>
                  {msg.toolTrace && msg.toolTrace.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.toolTrace.map((t, i) => (
                        <span
                          key={`${msg.id}-t-${i}`}
                          className={cn(
                            "rounded-md border px-2 py-0.5 text-[11px]",
                            t.ok
                              ? "border-[var(--cursor-agent-border)] text-[var(--cursor-agent-muted)]"
                              : "border-red-500/40 text-red-300",
                          )}
                        >
                          {t.summary}
                        </span>
                      ))}
                    </div>
                  )}
                  {msg.pendingConfirmations?.map((c) => (
                    <div
                      key={c.id}
                      className="cursor-agent-confirm rounded-xl border border-[var(--cursor-agent-border)] bg-[var(--cursor-agent-panel)] p-3"
                    >
                      <p className="text-[13px] font-medium text-[var(--cursor-agent-fg)]">
                        {c.title}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--cursor-agent-muted)]">
                        High-impact action — confirm to run{" "}
                        <code className="text-[var(--cursor-agent-fg)]/80">
                          {c.tool}
                        </code>
                        .
                      </p>
                      <div className="mt-2.5 flex gap-2">
                        <button
                          type="button"
                          disabled={confirmMut.isPending}
                          onClick={() =>
                            confirmMut.mutate({
                              confirmationId: c.id,
                              approved: true,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-md bg-[var(--cursor-agent-accent)] px-2.5 py-1 text-[11px] font-semibold text-[var(--cursor-agent-bg)] disabled:opacity-50"
                        >
                          <Check className="h-3 w-3" />
                          Confirm
                        </button>
                        <button
                          type="button"
                          disabled={confirmMut.isPending}
                          onClick={() =>
                            confirmMut.mutate({
                              confirmationId: c.id,
                              approved: false,
                            })
                          }
                          className="rounded-md px-2.5 py-1 text-[11px] font-medium text-[var(--cursor-agent-muted)] hover:bg-white/[0.06] hover:text-[var(--cursor-agent-fg)] disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ),
          )}

          {chat.isPending && (
            <div className="flex items-center gap-2.5 text-[var(--cursor-agent-muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--cursor-agent-accent)]" />
              <p className="text-[13px]">Thinking…</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="cursor-agent-dock shrink-0 sticky bottom-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-0">
        <div className="cursor-agent-dock-fade pointer-events-none h-6" />
        <div className="cursor-agent-composer rounded-2xl px-3 pb-2 pt-2.5">
          <textarea
            ref={textareaRef}
            value={draft}
            rows={1}
            placeholder={
              mode === "ask"
                ? "Ask about markets, leads, pipeline…"
                : "Plan, search, update CRM…"
            }
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="max-h-40 min-h-[40px] w-full resize-none bg-transparent text-[13px] leading-relaxed text-[var(--cursor-agent-fg)] outline-none placeholder:text-[var(--cursor-agent-muted)]"
          />
          <div className="mt-1 flex items-center gap-1">
            <div className="flex rounded-md border border-[var(--cursor-agent-border)] p-0.5">
              <button
                type="button"
                onClick={() => setMode("agent")}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-medium transition",
                  mode === "agent"
                    ? "bg-white/[0.08] text-[var(--cursor-agent-fg)]"
                    : "text-[var(--cursor-agent-muted)] hover:text-[var(--cursor-agent-fg)]",
                )}
              >
                Agent
              </button>
              <button
                type="button"
                onClick={() => setMode("ask")}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-medium transition",
                  mode === "ask"
                    ? "bg-white/[0.08] text-[var(--cursor-agent-fg)]"
                    : "text-[var(--cursor-agent-muted)] hover:text-[var(--cursor-agent-fg)]",
                )}
              >
                Ask
              </button>
            </div>
            <div className="flex-1" />
            {chat.isPending ? (
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[var(--cursor-agent-fg)] transition hover:bg-white/15"
                title="Stop"
                onClick={() => chat.reset()}
              >
                <Square className="h-2.5 w-2.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={send}
                className="cursor-agent-send flex h-7 w-7 items-center justify-center rounded-full transition disabled:cursor-not-allowed"
                title="Send"
              >
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
