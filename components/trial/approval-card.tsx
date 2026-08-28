"use client";

import { useState } from "react";
import { ShieldQuestion } from "lucide-react";
import { motion } from "motion/react";

// The human side of the agent loop: an agent requested a deep scan and the
// page owner decides. Approve opens a revisioned DEEP_SCAN run; reject
// records the refusal. Either way the card leaves on the next status poll
// (the approval stops being PENDING server-side).
export function ApprovalCard({
  runId,
  approvalId,
  dimension,
}: {
  runId: string;
  approvalId: string;
  dimension: string | null;
}) {
  const [busy, setBusy] = useState(false);

  async function decide(action: "approve" | "reject") {
    setBusy(true);
    try {
      await fetch(
        `/api/trials/${encodeURIComponent(runId)}/approvals/${encodeURIComponent(approvalId)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action }),
        },
      );
    } catch {
      // The poll loop re-renders the card if the decision did not land.
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", visualDuration: 0.35, bounce: 0.25 }}
      className="mt-3 flex flex-wrap items-center gap-3 border border-primary/50 bg-primary/5 px-3 py-2"
    >
      <ShieldQuestion className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-xs text-foreground">
        The agent requests a deep scan
        {dimension ? (
          <>
            {" "}
            on{" "}
            <span className="font-medium">
              {dimension.replaceAll("_", " ").toLowerCase()}
            </span>
          </>
        ) : null}
        . Extra evidence gathering runs only with your approval.
      </p>
      <span className="inline-flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => decide("approve")}
          className="cut-action h-8 bg-primary px-3 font-mono text-[0.6rem] font-medium uppercase tracking-[0.07em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => decide("reject")}
          className="h-8 border border-border px-3 font-mono text-[0.6rem] font-medium uppercase tracking-[0.07em] text-muted-foreground transition-colors hover:border-kill hover:text-kill disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring"
        >
          Reject
        </button>
      </span>
    </motion.div>
  );
}
