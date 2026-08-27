"use client";

import { useEffect } from "react";

import {
  getModelContext,
  registerAllTools,
  webmcpTools,
} from "@/lib/webmcp/registry";

export function WebMCPProvider() {
  useEffect(() => {
    const modelContext = getModelContext();

    if (!modelContext) {
      return;
    }

    const controller = new AbortController();

    registerAllTools(modelContext, webmcpTools, controller.signal).catch((error: unknown) => {
      if (controller.signal.aborted || process.env.NODE_ENV === "production") {
        return;
      }

      console.error("Verdiqt agent tool registration failed", error);
    });

    return () => controller.abort();
  }, []);

  return null;
}
