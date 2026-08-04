"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

export default function IntegrationsPage() {
  const utils = trpc.useUtils();
  const twilioQuery = trpc.integrations.getTwilio.useQuery();

  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [testTo, setTestTo] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (twilioQuery.data?.fromNumber) {
      setFromNumber(twilioQuery.data.fromNumber);
    }
  }, [twilioQuery.data?.fromNumber]);

  const save = trpc.integrations.saveTwilio.useMutation({
    onSuccess: () => {
      utils.integrations.getTwilio.invalidate();
      utils.comms.smsStatus.invalidate();
      setAuthToken("");
      setAccountSid("");
      setMessage("Twilio credentials saved securely.");
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setMessage(null);
    },
  });

  const clear = trpc.integrations.clearTwilio.useMutation({
    onSuccess: () => {
      utils.integrations.getTwilio.invalidate();
      utils.comms.smsStatus.invalidate();
      setAccountSid("");
      setAuthToken("");
      setFromNumber("");
      setMessage("Twilio disconnected.");
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setMessage(null);
    },
  });

  const test = trpc.integrations.testTwilio.useMutation({
    onSuccess: () => {
      utils.integrations.getTwilio.invalidate();
      setMessage("Test SMS sent. Check the destination phone.");
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setMessage(null);
    },
  });

  const configured = twilioQuery.data?.configured === true;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:px-6">
      <PageHeader
        title="Integrations"
        description="Connect your own messaging providers. Aurora never resells Twilio — you bring your own account."
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Twilio (Bring Your Own)</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Enter your Account SID, Auth Token, and a Twilio phone number you
              own. Used for one-click SMS, follow-ups, and buyer outreach.
            </p>
          </div>
          {configured ? (
            <Badge variant="outline">Connected</Badge>
          ) : (
            <Badge variant="outline">Not connected</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {configured && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p>
                Account SID:{" "}
                <span className="font-mono">
                  {twilioQuery.data?.accountSid}
                </span>
              </p>
              <p className="mt-1">
                From:{" "}
                <span className="font-mono">
                  {twilioQuery.data?.fromNumber}
                </span>
              </p>
              {twilioQuery.data?.lastVerifiedAt && (
                <p className="mt-1 text-xs text-slate-500">
                  Last verified{" "}
                  {new Date(twilioQuery.data.lastVerifiedAt).toLocaleString()}
                </p>
              )}
              {twilioQuery.data?.lastError && (
                <p className="mt-1 text-xs text-red-600">
                  {twilioQuery.data.lastError}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="accountSid">Account SID</Label>
            <Input
              id="accountSid"
              autoComplete="off"
              placeholder={
                configured
                  ? "Re-enter to update (starts with AC…)"
                  : "ACxxxxxxxx…"
              }
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="authToken">Auth Token</Label>
            <Input
              id="authToken"
              type="password"
              autoComplete="new-password"
              placeholder={
                configured ? "Re-enter to update" : "Your Twilio auth token"
              }
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fromNumber">Phone Number</Label>
            <Input
              id="fromNumber"
              placeholder="+15551234567"
              value={fromNumber}
              onChange={(e) => setFromNumber(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={
                !accountSid || !authToken || !fromNumber || save.isPending
              }
              onClick={() =>
                save.mutate({
                  accountSid,
                  authToken,
                  fromNumber,
                })
              }
            >
              {configured ? "Update credentials" : "Save securely"}
            </Button>
            {configured && (
              <Button
                variant="secondary"
                disabled={clear.isPending}
                onClick={() => clear.mutate()}
              >
                Disconnect
              </Button>
            )}
          </div>

          {configured && (
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <p className="text-sm font-medium text-slate-800">
                Send test SMS
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Your mobile (+1…)"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                />
                <Button
                  variant="secondary"
                  disabled={!testTo || test.isPending}
                  onClick={() => test.mutate({ to: testTo })}
                >
                  Test
                </Button>
              </div>
            </div>
          )}

          {message && <p className="text-sm text-emerald-700">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <p className="text-xs text-slate-500">
            Credentials are encrypted at rest. Platform env Twilio is only a
            fallback when you have not connected your own account.{" "}
            <Link
              href="/dashboard/settings/billing"
              className="text-blue-600 hover:underline"
            >
              Billing
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
