import { spawn } from "node:child_process";
import { join } from "node:path";

import { getLocalSupabaseCredentials, root } from "./s4-local.mjs";

const port = 3201;
const origin = `http://127.0.0.1:${port}`;
const credentials = getLocalSupabaseCredentials();
const environment = { ...process.env };
// Next's env loader fills an absent key back in from .env.local, so an empty
// string (present but falsy) is required to actually override it here.
environment.RENZ_CLIENT_PREVIEW = "";
delete environment.NO_COLOR;
Object.assign(environment, {
  DO_NOT_TRACK: "1",
  ...Object.fromEntries([
    ["NEXT_PUBLIC_SUPABASE_URL", credentials.url],
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", credentials.publishableKey],
    ["SUPABASE_SECRET_KEY", credentials.secretKey],
    ["SUPABASE_ANON_KEY", credentials.anonymousKey],
  ]),
});

const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");
const server = spawn(process.execPath, [nextCli, "start", "--port", String(port)], {
  cwd: root,
  env: environment,
  stdio: "ignore",
  windowsHide: true,
});

function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error("Preview-off server exited before verification.");
    try {
      const response = await fetch(`${origin}/`);
      if (response.ok) return;
    } catch {
      // The socket is expected to reject briefly while Next starts.
    }
    await pause(250);
  }
  throw new Error("Preview-off server did not become ready within 60 seconds.");
}

async function documentAt(pathname) {
  const response = await fetch(`${origin}${pathname}`, { redirect: "manual" });
  return { response, html: await response.text() };
}

function assertAbsent(html, candidates, pathname) {
  for (const candidate of candidates) {
    if (html.includes(candidate)) {
      throw new Error(`Preview-only marker remained in ${pathname}: ${candidate}`);
    }
  }
}

try {
  await waitForServer();

  const home = await documentAt("/");
  if (!home.response.ok) throw new Error("Preview-off home route did not return success.");
  assertAbsent(
    home.html,
    [
      "brand-opener",
      "client-preview-label",
      // "provisional-renz-mark" is intentionally excluded: it is the real,
      // non-preview production placeholder identity mark rendered by
      // PublicFooter's non-preview branch, not a preview-only artifact.
      "project-studies",
      "testimonial-preview",
      "institutional-proof-preview",
      "01-homepage-hero",
    ],
    "/",
  );

  const expertise = await documentAt("/expertise");
  if (!expertise.response.ok)
    throw new Error("Preview-off expertise route did not return success.");
  assertAbsent(
    expertise.html,
    ["expertise-preview", "Provisional taxonomy / interaction preview"],
    "/expertise",
  );

  const projects = await documentAt("/projects");
  if (!projects.response.ok) throw new Error("Preview-off projects route did not return success.");
  assertAbsent(
    projects.html,
    [
      "project-studies",
      "Concept visual / not project evidence",
      "03-homepage-selected-projects",
      "06-project-detail",
    ],
    "/projects",
  );

  const about = await documentAt("/about");
  if (!about.response.ok) throw new Error("Preview-off About route did not return success.");
  assertAbsent(about.html, ["about-preview", "Company profile, composed with restraint"], "/about");

  const contact = await documentAt("/contact");
  if (!contact.response.ok) throw new Error("Preview-off contact route did not return success.");
  assertAbsent(
    contact.html,
    ["contact-preview-channels", "Address pending approval", "location-foundation"],
    "/contact",
  );

  const start = await documentAt("/start-a-project");
  if (!start.response.ok)
    throw new Error("Preview-off project-entry route did not return success.");
  assertAbsent(start.html, ["guided-entry-preview", "Seven calm decisions"], "/start-a-project");

  const study = await documentAt("/projects/experience-study");
  if (study.response.status !== 404) {
    throw new Error(
      `Preview-off experience study returned ${study.response.status}, expected 404.`,
    );
  }

  const brandStudy = await documentAt("/brand-study");
  if (brandStudy.response.status !== 404) {
    throw new Error(
      `Preview-off brand study returned ${brandStudy.response.status}, expected 404.`,
    );
  }

  process.stdout.write(
    "S9A-P preview-off boundary passed: studies, opener, placeholders, and study route are absent.\n",
  );
} finally {
  if (server.exitCode === null) server.kill();
}
