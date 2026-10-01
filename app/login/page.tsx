"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoMark } from "@/components/logo";

export default function LoginPage() {
  const [next, setNext] = useState("/dashboard");

  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      const n = qs.get("next");
      if (n && n.startsWith("/") && !n.startsWith("//") && !n.includes("://")) {
        // One-time read of the query string on mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNext(n);
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <LogoMark size={40} />
        <div>
          <p className="font-display text-2xl font-medium tracking-tight">Docket</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-smoke">
            Sign in to continue
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Notion login</CardTitle>
          <CardDescription>
            One click signs you in and unlocks the dashboard and settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button render={<a href={`/api/notion/auth?next=${encodeURIComponent(next)}`} />}>
            Sign in with Notion
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
