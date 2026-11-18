// The list of scheduled Discord events. Add an entry to schedule an event; it
// only posts inside its [start, end) window, so finished entries are inert and
// can be deleted whenever convenient. Changing this file = commit + deploy.
//
// Each entry pairs a reusable KIND (kinds/*.ts) with this run's config. The same
// kind can appear several times with different channels/windows/options.

import { bounty } from "./kinds/bounty";
import type { ScheduledEvent } from "./types";

// Clan bot-test channel.
const TEST_CHANNEL = "1572689016845766656";

export const EVENTS: ScheduledEvent[] = [
  // TESTING: posts every minute to the test channel. Before going live, set the
  // real channel, window and cadence (e.g. weekly: "0 0 * * 1").
  {
    id: "bounty-test",
    channelId: TEST_CHANNEL,
    start: "2026-11-18T00:00:00Z",
    end: "2026-12-31T00:00:00Z",
    cron: "* * * * *",
    timeZone: "UTC",
    post: bounty(),
  },
];
