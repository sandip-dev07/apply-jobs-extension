"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppNav } from "@/components/app-nav";

type Stage = "job" | "form" | "done";

export default function TestPage() {
  const [stage, setStage] = useState<Stage>("job");
  const [log, setLog] = useState<string[]>([
    "Mock job page loaded. The extension content script should extract the JSON-LD below.",
  ]);

  function push(msg: string) {
    setLog((l) => [...l, `${new Date().toLocaleTimeString()} — ${msg}`]);
  }

  return (
    <>
      <AppNav />
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
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

      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Mock job page</h1>
        <p className="text-sm text-muted-foreground">
          Simulates: Job page → Apply → Application form → Submit → “Application submitted”.
          Load the unpacked extension, open this page, and watch detection fire.
        </p>
      </div>

      {stage === "job" ? (
        <Card>
          <CardHeader>
            <CardTitle>Acme Corp — Frontend Engineer (Mock)</CardTitle>
            <CardDescription>Bengaluru, India · Full-time · via MockBoard</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              We are hiring a frontend engineer to build delightful job-tracking experiences.
            </p>
            <p className="text-sm text-muted-foreground">
              You will own the Chrome extension detection pipeline and the Notion sync backend.
              React, TypeScript, and attention to detail required. (Mock posting for end-to-end testing.)
            </p>
            <div>
              <Button
                onClick={() => {
                  setStage("form");
                  push("Apply button clicked — extension should start tracking.");
                }}
              >
                Apply Now
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {stage === "form" ? (
        <Card>
          <CardHeader>
            <CardTitle>Application form (mock)</CardTitle>
            <CardDescription>Only metadata is collected by the extension — never form contents.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <input className="h-8 rounded-lg border border-input px-2.5 text-sm" placeholder="Name (not collected)" />
            <input className="h-8 rounded-lg border border-input px-2.5 text-sm" placeholder="Email (not collected)" />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setStage("done");
                  push("Application submitted — extension should detect success and save to Notion.");
                }}
              >
                Submit application
              </Button>
              <Button variant="outline" onClick={() => setStage("job")}>Back</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {stage === "done" ? (
        <Card role="status">
          <CardHeader>
            <CardTitle>Application submitted</CardTitle>
            <CardDescription>Thank you for applying! We&apos;ve received your application.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm font-medium text-green-700">
              ✓ Your application has been submitted successfully.
            </p>
            <div>
              <Button variant="outline" onClick={() => { setStage("job"); push("Reset to job page."); }}>
                Reset demo
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>What to verify</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
          <p>1. Job extraction: company “Acme Corp”, title “Frontend Engineer (Mock)”.</p>
          <p>2. Apply detection: clicking “Apply Now” starts tracking.</p>
          <p>3. Submission detection: submitting shows the success banner.</p>
          <p>4. Duplicate prevention: submitting twice saves only once.</p>
          {log.map((l, i) => (
            <p key={i} className="font-mono text-xs">• {l}</p>
          ))}
        </CardContent>
      </Card>
    </main>
    </>
  );
}
