import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAgentChannelSnapshot,
  getAgentChannelServerSnapshot,
  recordToolActivity,
  resetAgentChannel,
  setAgentChannel,
  subscribeAgentChannel,
} from "@/lib/webmcp/bus";

describe("agent channel store", () => {
  afterEach(() => {
    resetAgentChannel();
  });

  it("serves a stable checking snapshot for the server render", () => {
    expect(getAgentChannelServerSnapshot()).toBe(getAgentChannelServerSnapshot());
    expect(getAgentChannelServerSnapshot().state).toBe("checking");
  });

  it("walks the registration state transitions and notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAgentChannel(listener);

    setAgentChannel({ state: "registering", totalCount: 12 });
    setAgentChannel({
      state: "partial",
      registeredCount: 11,
      totalCount: 12,
      failedTools: ["rank_portfolio"],
    });

    expect(getAgentChannelSnapshot()).toMatchObject({
      state: "partial",
      registeredCount: 11,
      failedTools: ["rank_portfolio"],
    });
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setAgentChannel({ state: "registered", registeredCount: 12, failedTools: [] });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("caps the activity feed at twenty entries, newest first", () => {
    for (let i = 0; i < 25; i += 1) {
      recordToolActivity({ tool: `tool_${i}`, status: "ok", at: i });
    }

    const activity = getAgentChannelSnapshot().activity;
    expect(activity).toHaveLength(20);
    expect(activity[0].tool).toBe("tool_24");
  });

  it("resets to the initial state on teardown", () => {
    setAgentChannel({ state: "registered", registeredCount: 12, totalCount: 12 });
    recordToolActivity({ tool: "get_verdict", status: "ok", at: 1 });

    resetAgentChannel();

    expect(getAgentChannelSnapshot()).toMatchObject({
      state: "checking",
      registeredCount: 0,
      activity: [],
    });
  });
});
