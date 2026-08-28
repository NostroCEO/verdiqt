"use client";

import { useEffect, useRef, useState } from "react";

import {
  hasWorkerProgress,
  isResearchPhase,
  isTerminalStatus,
  mergeEvidenceById,
  type TrialStatusValue,
} from "@/lib/trial-progress";

export type LiveDimensionScore = {
  dimension: string;
  score: number;
  rationale: string;
  keyFinding: string | null;
  evidenceIds: string[];
};

export type LiveEvidenceItem = {
  id: string;
  source: string;
  url: string;
  title: string;
  snippet: string;
  dimension: string;
  strength: number;
  humanState: string;
};

export type LiveTrialState = {
  status: TrialStatusValue;
  evidenceCount: number;
  evidence: LiveEvidenceItem[];
  compositeScore: number | null;
  verdict: string | null;
  dimensions: LiveDimensionScore[] | null;
  pivotDirection: string | null;
  nextStepAction: string | null;
  benchOpinion: string | null;
  benchConfidence: number | null;
  sourceStates: Record<string, { state: string; count: number }>;
  caseFile: {
    oneLiner: string;
    audience: string;
    problem: string;
    category: string;
    keywords: string[];
  } | null;
  pendingApprovals: Array<{
    approvalId: string;
    kind: string;
    dimension: string | null;
  }>;
  weights: Record<string, number> | null;
  lastEventKind: string | null;
  connected: boolean;
  workerSeen: boolean;
  error: string | null;
  errorCode: string | null;
};

const initialState: LiveTrialState = {
  status: null,
  evidenceCount: 0,
  evidence: [],
  compositeScore: null,
  verdict: null,
  dimensions: null,
  pivotDirection: null,
  nextStepAction: null,
  benchOpinion: null,
  benchConfidence: null,
  sourceStates: {},
  caseFile: null,
  pendingApprovals: [],
  weights: null,
  lastEventKind: null,
  connected: false,
  workerSeen: false,
  error: null,
  errorCode: null,
};

const STATUS_POLL_MS = 5000;
const EVIDENCE_POLL_MS = 2500;

// Live trial state, SSE-independent by design (eng review R0.3): persisted
// status polls on its own clock while the trial runs, SSE events only
// accelerate refetches, and evidence polls during the research phases,
// pausing while the tab is hidden. Nothing here can make a working pipeline
// look dead just because a stream buffered.
export function useTrialLive(runId: string | null): LiveTrialState {
  const [state, setState] = useState<LiveTrialState>(initialState);
  const sawStageEventRef = useRef(false);
  const statusRef = useRef<TrialStatusValue>(null);

  useEffect(() => {
    // EVERY run change starts from a clean slate (founder bug report
    // 2026-08-28: filing another case kept the previous case's evidence and
    // verdict on screen, mixing two cases). Evidence merges are per-run only.
    setState(initialState);
    sawStageEventRef.current = false;
    statusRef.current = null;

    if (!runId) {
      return;
    }

    let cancelled = false;
    let terminal = false;
    let verdictFetched = false;
    let source: EventSource | null = null;
    const encoded = encodeURIComponent(runId);

    async function fetchVerdictDetails() {
      if (verdictFetched) return;
      verdictFetched = true;
      try {
        const response = await fetch(`/api/trials/${encoded}/verdict`, {
          cache: "no-store",
          credentials: "include",
        });
        if (cancelled || !response.ok) return;
        const body = (await response.json()) as {
          dimensions: Array<{
            dimension: string;
            score: number;
            rationale: string;
            key_finding?: string | null;
            evidence_ids: string[];
          }>;
          pivot_direction: string | null;
          weights?: Record<string, number> | null;
          next_step: {
            action?: string;
            bench_opinion?: string;
            bench_confidence?: number;
          } | null;
        };
        setState((current) => ({
          ...current,
          dimensions: body.dimensions.map((entry) => ({
            dimension: entry.dimension,
            score: entry.score,
            rationale: entry.rationale,
            keyFinding: entry.key_finding ?? null,
            evidenceIds: entry.evidence_ids,
          })),
          pivotDirection: body.pivot_direction,
          nextStepAction: body.next_step?.action ?? null,
          benchOpinion: body.next_step?.bench_opinion ?? null,
          benchConfidence: body.next_step?.bench_confidence ?? null,
          weights: body.weights ?? null,
        }));
      } catch {
        verdictFetched = false;
      }
    }

    async function fetchEvidence() {
      try {
        const response = await fetch(`/api/trials/${encoded}/evidence`, {
          cache: "no-store",
          credentials: "include",
        });
        if (cancelled || !response.ok) return;
        const body = (await response.json()) as {
          evidence: Array<{
            id: string;
            source: string;
            url: string;
            title: string;
            snippet: string;
            dimension: string;
            strength: number;
            human_state: string;
          }>;
        };
        setState((current) => ({
          ...current,
          evidence: mergeEvidenceById(
            current.evidence,
            body.evidence.map((item) => ({
              id: item.id,
              source: item.source,
              url: item.url,
              title: item.title,
              snippet: item.snippet,
              dimension: item.dimension,
              strength: item.strength,
              humanState: item.human_state,
            })),
          ),
        }));
      } catch {
        // Next poll retries.
      }
    }

    async function refetchStatus() {
      try {
        const response = await fetch(`/api/trials/${encoded}/status`, {
          cache: "no-store",
          credentials: "include",
        });
        if (cancelled) return;

        if (!response.ok) {
          setState((current) => ({ ...current, error: `status_${response.status}` }));
          return;
        }

        const body = (await response.json()) as {
          status: TrialStatusValue;
          evidence_count: number;
          composite_score: number | null;
          verdict: string | null;
          error_code?: string | null;
          source_states?: Record<string, { state: string; count: number }>;
          case_file?: {
            one_liner: string;
            audience: string;
            problem: string;
            category: string;
            keywords: string[];
          } | null;
          pending_approvals?: Array<{
            approval_id: string;
            kind: string;
            dimension: string | null;
          }>;
        };

        statusRef.current = body.status;
        setState((current) => ({
          ...current,
          status: body.status,
          evidenceCount: body.evidence_count,
          compositeScore: body.composite_score,
          verdict: body.verdict,
          errorCode: body.error_code ?? null,
          sourceStates: body.source_states ?? current.sourceStates,
          caseFile: body.case_file
            ? {
                oneLiner: body.case_file.one_liner,
                audience: body.case_file.audience,
                problem: body.case_file.problem,
                category: body.case_file.category,
                keywords: body.case_file.keywords,
              }
            : current.caseFile,
          pendingApprovals: (body.pending_approvals ?? []).map((entry) => ({
            approvalId: entry.approval_id,
            kind: entry.kind,
            dimension: entry.dimension,
          })),
          connected: true,
          workerSeen: hasWorkerProgress({
            status: body.status,
            evidenceCount: body.evidence_count,
            sawStageEvent: sawStageEventRef.current,
          }),
          error: null,
        }));

        if (isResearchPhase(body.status) || body.status === "COMPLETE") {
          void fetchEvidence();
        }
        if (body.status === "COMPLETE") {
          void fetchVerdictDetails();
        }
        if (isTerminalStatus(body.status)) {
          terminal = true;
          source?.close();
        } else if (terminal) {
          // A human or agent action (pin, reject, weights, approval) opened
          // a fresh revision after the verdict: follow it and refetch the
          // verdict details when the new run completes.
          terminal = false;
          verdictFetched = false;
        }
      } catch {
        if (!cancelled) {
          setState((current) => ({ ...current, error: "status_unreachable" }));
        }
      }
    }

    // The status poll NEVER stops while the dashboard is open: a completed
    // trial can re-enter the pipeline at any moment (rescore, deep scan),
    // and the 2s server micro-cache keeps the idle cost negligible.
    const statusTimer = setInterval(() => {
      if (document.visibilityState !== "hidden") {
        void refetchStatus();
      }
    }, STATUS_POLL_MS);

    const evidenceTimer = setInterval(() => {
      if (
        !terminal &&
        document.visibilityState !== "hidden" &&
        isResearchPhase(statusRef.current)
      ) {
        void fetchEvidence();
      }
    }, EVIDENCE_POLL_MS);

    void refetchStatus();

    source = new EventSource(`/api/trials/${encoded}/stream`);
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as { kind?: string };
        if (event.kind === "stage_started") {
          sawStageEventRef.current = true;
        }
        setState((current) => ({
          ...current,
          lastEventKind: event.kind ?? null,
          workerSeen: current.workerSeen || event.kind === "stage_started",
        }));
        void refetchStatus();
      } catch {
        // The status poll is the source of truth anyway.
      }
    };
    source.onerror = () => {
      // EventSource reconnects itself with Last-Event-ID; the status poll
      // keeps the UI honest meanwhile, so no error state is surfaced here.
    };

    return () => {
      cancelled = true;
      clearInterval(statusTimer);
      clearInterval(evidenceTimer);
      source?.close();
      sawStageEventRef.current = false;
      statusRef.current = null;
    };
  }, [runId]);

  return state;
}
