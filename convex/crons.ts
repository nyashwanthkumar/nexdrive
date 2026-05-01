import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "delete old trashed files",
  { hourUTC: 2, minuteUTC: 0 },
  internal.files.permanentlyDeleteOldFiles
);

export default crons;
