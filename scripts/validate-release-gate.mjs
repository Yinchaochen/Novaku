import fs from "node:fs";

const requiredHttpsInputs = [
  ["BACKEND_CI_URL", "Backend CI"],
  ["MAESTRO_RUN_URL", "Maestro Android"],
  ["SENTRY_RELEASE_URL", "Sentry release health"],
];
const minimumObservationHours = { "10": 0, "50": 2, "100": 24 };

function numericInput(name) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a number`);
  }
  return value;
}

function integerInput(name) {
  const value = numericInput(name);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

// A missing or non-HTTPS evidence link blocks the release, but it is reported as
// a blocking reason rather than crashing the run; the auditable report is the
// whole point of this step, so every failure mode must render inside it.
function httpsEvidence(name, label) {
  const raw = process.env[name]?.trim();
  let url;
  try {
    url = new URL(raw);
  } catch {
    return { reason: `${label} evidence (${name}) must be a valid URL` };
  }
  if (url.protocol !== "https:") {
    return { reason: `${label} evidence (${name}) must use HTTPS` };
  }
  return { url: url.toString() };
}

function buildReport(status, context, evidenceLines, failures) {
  const lines = [
    `# Mobile release attestation: ${status}`,
    "",
    "> Values are operator-attested from Sentry release health and the incident",
    "> tracker. This gate enforces the rollout policy on the declared values; it",
    "> does not yet pull them automatically.",
    "",
    ...context,
    "",
    "## Evidence",
    "",
    ...evidenceLines,
  ];
  if (failures.length > 0) {
    lines.push("", "## Blocking Reasons", "");
    lines.push(...failures.map((failure) => `- ${failure}`));
  }
  return `${lines.join("\n")}\n`;
}

function emit(report, blocked) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  if (process.env.RELEASE_GATE_REPORT) {
    fs.writeFileSync(process.env.RELEASE_GATE_REPORT, report);
  }
  console.log(report);
  if (blocked) {
    process.exitCode = 1;
  }
}

try {
  const releaseName = process.env.RELEASE_NAME?.trim();
  if (!releaseName) {
    throw new Error("RELEASE_NAME is required");
  }

  const stage = process.env.RELEASE_STAGE?.trim();
  if (!(stage in minimumObservationHours)) {
    throw new Error("RELEASE_STAGE must be 10, 50, or 100");
  }

  const crashFreeSessions = numericInput("CRASH_FREE_SESSIONS");
  if (crashFreeSessions < 0 || crashFreeSessions > 100) {
    throw new Error("CRASH_FREE_SESSIONS must be between 0 and 100");
  }

  const openP0P1 = integerInput("OPEN_P0_P1");
  const observationHours = numericInput("OBSERVATION_HOURS");
  if (observationHours < 0) {
    throw new Error("OBSERVATION_HOURS must be non-negative");
  }

  const failures = [];
  const evidenceLines = [];
  for (const [name, label] of requiredHttpsInputs) {
    const result = httpsEvidence(name, label);
    if (result.url) {
      evidenceLines.push(`- [${label}](${result.url})`);
    } else {
      evidenceLines.push(`- ${label}: missing or invalid`);
      failures.push(result.reason);
    }
  }

  if (crashFreeSessions < 99) {
    failures.push(
      `Crash-free sessions ${crashFreeSessions}% is below the 99% threshold`,
    );
  }
  if (openP0P1 !== 0) {
    failures.push(`${openP0P1} open P0/P1 incident(s) remain`);
  }
  const requiredHours = minimumObservationHours[stage];
  if (observationHours < requiredHours) {
    failures.push(
      `Stage ${stage}% requires ${requiredHours} observation hour(s); received ${observationHours}`,
    );
  }

  const status = failures.length === 0 ? "PASS" : "BLOCKED";
  const context = [
    `- Release: \`${releaseName}\``,
    `- Requested rollout: \`${stage}%\``,
    `- Crash-free sessions: \`${crashFreeSessions}%\``,
    `- Open P0/P1 incidents: \`${openP0P1}\``,
    `- Observation window: \`${observationHours}h\``,
  ];
  emit(buildReport(status, context, evidenceLines, failures), failures.length > 0);
} catch (error) {
  emit(
    buildReport(
      "BLOCKED",
      [`- Error: \`${error.message}\``],
      ["- Evidence not evaluated"],
      [error.message],
    ),
    true,
  );
}
