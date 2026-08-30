"use client";

import { useEffect } from "react";

import {
  resetAgentChannel,
  setAgentChannel,
} from "@/lib/webmcp/bus";
import {
  getModelContext,
  registerAllTools,
  activeTools,
  type ModelContext,
} from "@/lib/webmcp/registry";

const POLL_INTERVAL_MS = 500;
const POLL_WINDOW_MS = 5000;

// Detection contract (docs/STATE.md 2026-08-27): check on mount, poll briefly
// for late injection, then settle on unsupported BUT keep passive re-checks
// (focus/visibilitychange) alive so a client that attaches its model context
// late still registers. Registration truth is Promise.allSettled per tool;
// partial results stay live for the agent. The registering/partial semantics
// are provisional until the Task 12 two-client live verification.
export function WebMCPProvider() {
  useEffect(() => {
    let cancelled = false;
    let attemptController: AbortController | null = null;
    let registrationDone = false;
    let pollTimer: number | null = null;
    let toolchangeContext: ModelContext | null = null;

    const totalCount = activeTools.length;

    async function refreshNativeCount(modelContext: ModelContext) {
      if (typeof modelContext.getTools !== "function") return;

      try {
        const native = await modelContext.getTools();
        if (cancelled || !Array.isArray(native)) return;

        const ourNames = new Set(activeTools.map((tool) => tool.name));
        const nativeCount = native.filter((tool) => {
          const name =
            typeof tool === "object" && tool !== null
              ? (tool as { name?: unknown }).name
              : undefined;
          return typeof name === "string" && ourNames.has(name);
        }).length;

        // The browser's own registry is the source of truth when available;
        // foreign tools registered by other scripts are ignored entirely.
        setAgentChannel({ registeredCount: nativeCount });
      } catch {
        // Progressive enhancement only: a failing getTools never degrades
        // the state the settled registration results established.
      }
    }

    const handleToolchange = () => {
      if (toolchangeContext) {
        void refreshNativeCount(toolchangeContext);
      }
    };

    async function register(modelContext: ModelContext) {
      if (registrationDone) return;
      registrationDone = true;
      stopPolling();

      const controller = new AbortController();
      attemptController = controller;
      setAgentChannel({ state: "registering", totalCount });

      const results = await registerAllTools(
        modelContext,
        activeTools,
        controller.signal,
      );

      // Results from an aborted attempt (StrictMode remount, navigation)
      // must never write into the store a newer attempt owns.
      if (cancelled || controller.signal.aborted) return;

      const failedTools = results.filter((r) => !r.ok).map((r) => r.name);
      const registeredCount = totalCount - failedTools.length;
      const state =
        registeredCount === totalCount
          ? "registered"
          : registeredCount > 0
            ? "partial"
            : "failed";

      setAgentChannel({ state, registeredCount, totalCount, failedTools });

      if (failedTools.length > 0 && process.env.NODE_ENV !== "production") {
        console.error("Verdiqt agent tool registration failed", failedTools);
      }

      if (registeredCount > 0) {
        removePassiveListeners();
        toolchangeContext = modelContext;
        modelContext.addEventListener?.("toolchange", handleToolchange);
        void refreshNativeCount(modelContext);
      }
    }

    function detect(): boolean {
      const modelContext = getModelContext();
      if (modelContext) {
        void register(modelContext);
        return true;
      }
      return false;
    }

    const passiveDetect = () => {
      if (!registrationDone) {
        detect();
      }
    };

    function removePassiveListeners() {
      window.removeEventListener("focus", passiveDetect);
      document.removeEventListener("visibilitychange", passiveDetect);
    }

    function stopPolling() {
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    setAgentChannel({ state: "checking", totalCount });

    if (!detect()) {
      window.addEventListener("focus", passiveDetect);
      document.addEventListener("visibilitychange", passiveDetect);

      const pollStartedAt = Date.now();
      pollTimer = window.setInterval(() => {
        if (detect()) return;

        if (Date.now() - pollStartedAt >= POLL_WINDOW_MS) {
          stopPolling();
          if (!registrationDone) {
            setAgentChannel({ state: "unsupported", totalCount });
          }
        }
      }, POLL_INTERVAL_MS);
    }

    return () => {
      cancelled = true;
      attemptController?.abort();
      stopPolling();
      removePassiveListeners();
      if (toolchangeContext) {
        toolchangeContext.removeEventListener?.("toolchange", handleToolchange);
        toolchangeContext = null;
      }
      resetAgentChannel();
    };
  }, []);

  return null;
}
