"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

export function LeadCrmPanel({ leadId }: { leadId: string }) {
  const utils = trpc.useUtils();
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [smsBody, setSmsBody] = useState("");

  const tasksQuery = trpc.task.listByLead.useQuery({ leadId });
  const activityQuery = trpc.activity.listByLead.useQuery({ leadId });
  const messagesQuery = trpc.comms.listMessages.useQuery({ leadId });
  const skipTraceQuery = trpc.skipTrace.getLatest.useQuery({ leadId });

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
  const sendSms = trpc.comms.sendSms.useMutation({
    onSuccess: () => {
      utils.comms.listMessages.invalidate({ leadId });
      utils.activity.listByLead.invalidate({ leadId });
      setSmsBody("");
    },
  });
  const requestSkipTrace = trpc.skipTrace.request.useMutation({
    onSuccess: () => utils.skipTrace.getLatest.invalidate({ leadId }),
  });
  const scriptQuery = trpc.comms.generateScript.useQuery({ leadId });

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
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <span
                  className={
                    task.completedAt
                      ? "text-slate-400 line-through"
                      : "text-slate-800"
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
                className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm"
              >
                <p className="font-medium text-slate-900">{item.title}</p>
                {item.body && (
                  <p className="mt-1 text-slate-600">{item.body}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">
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
          {scriptQuery.data && (
            <div className="rounded-xl bg-blue-50 p-3 text-sm text-slate-700">
              <p className="font-medium text-blue-900">AI Call Script</p>
              <p className="mt-1">{scriptQuery.data.script}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="SMS message..."
              value={smsBody}
              onChange={(e) => setSmsBody(e.target.value)}
            />
            <Button
              size="sm"
              disabled={!smsBody || sendSms.isPending}
              onClick={() => sendSms.mutate({ leadId, body: smsBody })}
            >
              Send SMS
            </Button>
          </div>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {messagesQuery.data?.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg px-3 py-2 text-sm ${
                  msg.direction === "inbound"
                    ? "bg-slate-100 text-slate-800"
                    : "bg-blue-50 text-blue-900"
                }`}
              >
                <p className="text-xs uppercase text-slate-500">
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
            <pre className="overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
              {JSON.stringify(skipTraceQuery.data.result, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
