"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock3,
  FlaskConical,
  MapPin,
  RotateCcw,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/app-shell";

type Stage = "job" | "form" | "done";

const STEPS: { id: Stage; label: string }[] = [
  { id: "job", label: "Job page" },
  { id: "form", label: "Apply" },
  { id: "done", label: "Submitted" },
];

export default function TestPage() {
  const [stage, setStage] = useState<Stage>("job");
  const [log, setLog] = useState<string[]>([
    "Mock job page loaded. The extension content script should extract the JSON-LD below.",
  ]);

  function push(msg: string) {
    setLog((l) => [...l, `${new Date().toLocaleTimeString()} — ${msg}`]);
  }

  const stepIndex = STEPS.findIndex((s) => s.id === stage);

  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-3xl min-w-0 flex-1 flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
        {/* Machine-readable job posting for the extension to prefer */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "JobPosting",
              title: "Frontend Engineer (Mock)",
              description:
                "Build delightful job-tracking experiences with React and TypeScript. You will own the Chrome extension detection pipeline and the Notion sync backend. (Mock posting for end-to-end testing.)",
              hiringOrganization: { "@type": "Organization", name: "Acme Corp" },
              jobLocation: { "@type": "Place", address: { addressLocality: "Bengaluru", addressCountry: "IN" } },
              datePosted: "2026-09-30",
            }),
          }}
        />

        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-widest text-muted-foreground uppercase">
            <FlaskConical className="size-3.5" aria-hidden />
            End-to-end test
          </p>
          <h1 className="font-heading mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Mock job page</h1>
          <p className="mt-1 text-sm break-words text-muted-foreground">
            Simulates: Job page → Apply → Application form → Submit → “Application submitted”.
            Install the extension from your browser&apos;s store, open this page, and watch detection fire.
          </p>
        </div>

        {/* Progress */}
        <ol className="grid grid-cols-3 gap-2" aria-label="Test progress">
          {STEPS.map((step, i) => {
            const done = i < stepIndex;
            const current = i === stepIndex;
            return (
              <li
                key={step.id}
                aria-current={current ? "step" : undefined}
                className={`flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-xs sm:px-3 ${
                  current
                    ? "border-primary bg-muted/60 font-medium"
                    : done
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "text-muted-foreground"
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    done
                      ? "bg-emerald-600 text-white"
                      : current
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span className="truncate">{step.label}</span>
              </li>
            );
          })}
        </ol>

        {stage === "job" ? (
          <Card className="min-w-0">
            <CardHeader className="flex-row items-start gap-3 space-y-0">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-bold text-secondary-foreground">
                AC
              </span>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base break-words sm:text-lg">Acme Corp — Frontend Engineer (Mock)</CardTitle>
                <CardDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden /> Bengaluru, India
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3.5" aria-hidden /> Full-time
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="size-3.5" aria-hidden /> via MockBoard
                  </span>
                </CardDescription>
              </div>
              <Badge variant="secondary" className="shrink-0">
                Mock
              </Badge>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {["React", "TypeScript", "Chrome extensions", "Notion API"].map((t) => (
                  <Badge key={t} variant="outline" className="font-normal">
                    {t}
                  </Badge>
                ))}
              </div>
              <p className="text-sm break-words text-muted-foreground">
                We are hiring a frontend engineer to build delightful job-tracking experiences.
              </p>
              <p className="text-sm break-words text-muted-foreground">
                You will own the Chrome extension detection pipeline and the Notion sync backend.
                React, TypeScript, and attention to detail required. (Mock posting for end-to-end testing.)
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setStage("form");
                    push("Apply button clicked — extension should start tracking.");
                  }}
                >
                  Apply Now
                  <ArrowRight />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {stage === "form" ? (
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Application form (mock)</CardTitle>
              <CardDescription>Only metadata is collected by the extension — never form contents.</CardDescription>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-3">
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor="mock-name">Full name</Label>
                <Input id="mock-name" placeholder="Name (not collected)" autoComplete="off" />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor="mock-email">Email</Label>
                <Input id="mock-email" type="email" placeholder="Email (not collected)" autoComplete="off" />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setStage("done");
                    push("Application submitted — extension should detect success and save to Notion.");
                  }}
                >
                  <Send />
                  Submit application
                </Button>
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setStage("job")}>
                  <ArrowLeft />
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {stage === "done" ? (
          <Card role="status" className="min-w-0 border-emerald-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-emerald-800 sm:text-lg">
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden />
                Application submitted
              </CardTitle>
              <CardDescription>Thank you for applying! We&apos;ve received your application.</CardDescription>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-3">
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium break-words text-emerald-800">
                ✓ Your application has been submitted successfully.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setStage("job"); push("Reset to job page."); }}>
                  <RotateCcw />
                  Reset demo
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">What to verify</CardTitle>
            <CardDescription>Run through the flow and confirm each detection fires.</CardDescription>
          </CardHeader>
          <CardContent className="flex min-w-0 flex-col gap-3">
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm break-words text-muted-foreground">
              <li>Job extraction: company “Acme Corp”, title “Frontend Engineer (Mock)”.</li>
              <li>Apply detection: clicking “Apply Now” starts tracking.</li>
              <li>Submission detection: submitting shows the success banner.</li>
              <li>Duplicate prevention: submitting twice saves only once.</li>
            </ol>
            <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Event log</p>
              <div className="flex max-h-48 min-w-0 flex-col gap-1 overflow-y-auto">
                {log.map((l, i) => (
                  <p key={i} className="font-mono text-xs break-words text-muted-foreground">• {l}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
