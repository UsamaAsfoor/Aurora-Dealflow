"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

const FOLLOW_UPS = [
  { id: "intro" as const, label: "Intro" },
  { id: "follow_up" as const, label: "Follow-up" },
  { id: "appointment" as const, label: "Appointment" },
  { id: "property_share" as const, label: "Property share" },
];

export function LeadCrmPanel({
  leadId,
  propertySummary,
}: {
  leadId: string;
  propertySummary?: string;
}) {
  const utils = trpc.useUtils();
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [phoneOverride, setPhoneOverride] = useState("");
  const [buyerIds, setBuyerIds] = useState<string[]>([]);
  const [buyerMessage, setBuyerMessage] = useState(
    "I have a property that may fit your buy box. Reply YES for details.",
  );
  const [smsFeedback, setSmsFeedback] = useState<string | null>(null);
  const [buyersOpen, setBuyersOpen] = useState(false);
  const [scriptRequested, setScriptRequested] = useState(false);

  const tasksQuery = trpc.task.listByLead.useQuery(
    { leadId },
    { staleTime: 20_000 },
  );
  const activityQuery = trpc.activity.listByLead.useQuery(
    { leadId },
    { staleTime: 15_000 },
  );
  const messagesQuery = trpc.comms.listMessages.useQuery(
    { leadId },
    { staleTime: 10_000 },
  );
  const skipTraceQuery = trpc.skipTrace.getLatest.useQuery(
    { leadId },
    { staleTime: 60_000 },
  );
  const smsStatus = trpc.comms.smsStatus.useQuery(undefined, {
    staleTime: 60_000,
  });
  const buyersQuery = trpc.buyer.list.useQuery(undefined, {
    enabled: buyersOpen,
    staleTime: 60_000,
  });
  const scriptQuery = trpc.comms.generateScript.useQuery(
    { leadId },
    { enabled: scriptRequested, staleTime: 5 * 60_000 },
  );

  const createNote = trpc.activity.createNote.useMutation({
    onSuccess: () => {
      utils.activity.listByLead.invalidate({ leadId });
      setNote("");
    },
  });
  const createTask = trpc.task.create.useMutation({
    onSuccess: () => {
      utils.task.listByLead.invalidate({ leadId });
      setTaskTitle("");
    },
  });
  const completeTask = trpc.task.complete.useMutation({
    onSuccess: () => utils.task.listByLead.invalidate({ leadId }),
  });

  const invalidateComms = () => {
    utils.comms.listMessages.invalidate({ leadId });
    utils.activity.listByLead.invalidate({ leadId });
  };

  const sendSms = trpc.comms.sendSms.useMutation({
    onSuccess: (data) => {
      invalidateComms();
      setSmsBody("");
      setSmsFeedback(`SMS sent to ${data.to}`);
    },
    onError: (err) => setSmsFeedback(err.message),
  });
  const sendFollowUp = trpc.comms.sendFollowUp.useMutation({
    onSuccess: (data) => {
      invalidateComms();
      setSmsFeedback(`Follow-up sent to ${data.to}`);
    },
    onError: (err) => setSmsFeedback(err.message),
  });
  const sendToBuyers = trpc.comms.sendPropertyToBuyers.useMutation({
    onSuccess: (data) => {
      invalidateComms();
      setSmsFeedback(`Sent to ${data.sent}/${data.sent + data.failed} buyers`);
    },
    onError: (err) => setSmsFeedback(err.message),
  });
  const requestSkipTrace = trpc.skipTrace.request.useMutation({
    onSuccess: () => utils.skipTrace.getLatest.invalidate({ leadId }),
  });

  const phoneOpts = phoneOverride.trim()
    ? { to: phoneOverride.trim() }
    : {};

  const toggleBuyer = (id: string) => {
    setBuyerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="New task..."
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
            <Button
              size="sm"
              disabled={!taskTitle || createTask.isPending}
              onClick={() =>
                createTask.mutate({ leadId, title: taskTitle })
              }
            >
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {tasksQuery.data?.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-3 py-2 text-sm"
              >
                <span
                  className={
                    task.completedAt
                      ? "text-[var(--color-muted-foreground)] line-through"
                      : "text-[var(--color-foreground)]"
                  }
                >
                  {task.title}
                </span>
                {!task.completedAt && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => completeTask.mutate({ taskId: task.id })}
                  >
                    Done
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes & Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Add a note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button
              size="sm"
              disabled={!note || createNote.isPending}
              onClick={() =>
                createNote.mutate({ leadId, body: note, title: "Note" })
              }
            >
              Save
            </Button>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {activityQuery.data?.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--aurora-surface)] px-3 py-2 text-sm"
              >
                <p className="font-medium text-[var(--color-foreground)]">
                  {item.title}
                </p>
                {item.body && (
                  <p className="mt-1 text-[var(--color-muted-foreground)]">
                    {item.body}
                  </p>
                )}
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Communications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
            {smsStatus.data?.mode === "byo_twilio" ? (
              <p>
                SMS via your Twilio · from{" "}
                <span className="font-mono text-[var(--color-foreground)]">
                  {smsStatus.data.fromNumber}
                </span>
              </p>
            ) : (
              <p>
                SMS in demo/platform mode.{" "}
                <Link
                  href="/dashboard/settings/integrations"
                  className="text-[color-mix(in_srgb,var(--color-primary)_55%,white)] hover:underline"
                >
                  Connect your Twilio
                </Link>{" "}
                for live sends.
              </p>
            )}
          </div>

          {!scriptRequested ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setScriptRequested(true)}
            >
              Generate call script
            </Button>
          ) : scriptQuery.isLoading ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Generating script…
            </p>
          ) : scriptQuery.data ? (
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] p-3 text-sm text-[var(--color-muted-foreground)]">
              <p className="font-medium text-[var(--color-foreground)]">
                AI Call Script
              </p>
              <p className="mt-1">{scriptQuery.data.script}</p>
            </div>
          ) : null}

          <Input
            placeholder="Phone override (optional — uses skip-trace phone)"
            value={phoneOverride}
            onChange={(e) => setPhoneOverride(e.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            {FOLLOW_UPS.map((tpl) => (
              <Button
                key={tpl.id}
                size="sm"
                variant="secondary"
                disabled={sendFollowUp.isPending}
                onClick={() =>
                  sendFollowUp.mutate({
                    leadId,
                    template: tpl.id,
                    ...phoneOpts,
                  })
                }
              >
                {tpl.label}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="SMS message..."
              value={smsBody}
              onChange={(e) => setSmsBody(e.target.value)}
            />
            <Button
              size="sm"
              disabled={!smsBody || sendSms.isPending}
              onClick={() =>
                sendSms.mutate({ leadId, body: smsBody, ...phoneOpts })
              }
            >
              Send SMS
            </Button>
          </div>

          {smsFeedback && (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {smsFeedback}
            </p>
          )}

          <div className="max-h-48 space-y-2 overflow-y-auto">
            {messagesQuery.data?.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg px-3 py-2 text-sm ${
                  msg.direction === "inbound"
                    ? "border border-[var(--color-border)] bg-[var(--color-muted)]/50 text-[var(--color-foreground)]"
                    : "border border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-foreground)]"
                }`}
              >
                <p className="text-xs uppercase text-[var(--color-muted-foreground)]">
                  {msg.channel} · {msg.direction}
                </p>
                <p>{msg.body}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send property to buyers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!buyersOpen ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setBuyersOpen(true)}
            >
              Choose buyers
            </Button>
          ) : (
            <>
              <Input
                placeholder="Message to buyers..."
                value={buyerMessage}
                onChange={(e) => setBuyerMessage(e.target.value)}
              />
              {propertySummary && (
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Attaches: {propertySummary}
                </p>
              )}
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {buyersQuery.isLoading ? (
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Loading buyers…
                  </p>
                ) : (buyersQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    No buyers yet.{" "}
                    <Link
                      href="/dashboard/buyers"
                      className="text-[color-mix(in_srgb,var(--color-primary)_55%,white)] hover:underline"
                    >
                      Add buyers
                    </Link>
                  </p>
                ) : (
                  buyersQuery.data?.map((buyer) => (
                    <label
                      key={buyer.id}
                      className="flex items-center gap-2 text-sm text-[var(--color-foreground)]"
                    >
                      <input
                        type="checkbox"
                        checked={buyerIds.includes(buyer.id)}
                        onChange={() => toggleBuyer(buyer.id)}
                        disabled={!buyer.phone}
                      />
                      <span>
                        {buyer.name}
                        {buyer.phone ? (
                          <span className="text-[var(--color-muted-foreground)]">
                            {" "}
                            · {buyer.phone}
                          </span>
                        ) : (
                          <span className="text-[var(--color-warning)]">
                            {" "}
                            · no phone
                          </span>
                        )}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <Button
                size="sm"
                disabled={
                  buyerIds.length === 0 ||
                  !buyerMessage ||
                  sendToBuyers.isPending
                }
                onClick={() =>
                  sendToBuyers.mutate({
                    leadId,
                    buyerIds,
                    body: buyerMessage,
                    propertySummary,
                  })
                }
              >
                Send to selected buyers
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skip Trace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            size="sm"
            variant="secondary"
            disabled={requestSkipTrace.isPending}
            onClick={() => requestSkipTrace.mutate({ leadId })}
          >
            Run Skip Trace (Demo)
          </Button>
          {skipTraceQuery.data?.result != null && (
            <pre className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--aurora-input)] p-3 text-xs text-[var(--color-muted-foreground)]">
              {JSON.stringify(skipTraceQuery.data.result, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
