#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = join(root, "supabase", "config.toml");
const environment = { ...process.env, DO_NOT_TRACK: "1" };
const fixtureId = "97000000-0000-4000-8000-000000000001";
const actorId = "97000000-0000-4000-8000-0000000000c8";
const fixtureReference = "RENZ-LEAD-2026-999977";
const deleteSessionName = "renz_c8_convert_a";
const finalizeSessionName = "renz_c8_convert_b";
const marker = "RENZ_C8_CONVERT_A_LOCKED";
const maximumCapturedOutput = 64 * 1024;

function readDatabaseContainerName() {
  const config = readFileSync(configPath, "utf8");
  const projectId = /^project_id\s*=\s*"([^"]+)"\s*$/mu.exec(config)?.[1];

  if (!projectId || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(projectId)) {
    throw new Error("Lead concurrency verification could not resolve a safe local project ID.");
  }

  return `supabase_db_${projectId}`;
}

const containerName = readDatabaseContainerName();
const psqlArguments = [
  "exec",
  "-i",
  containerName,
  "psql",
  "-X",
  "--no-align",
  "--tuples-only",
  "--quiet",
  "--set=ON_ERROR_STOP=1",
  "--set=VERBOSITY=sqlstate",
  "--username=postgres",
  "--dbname=postgres",
];

function inspectLocalDatabaseContainer() {
  const result = spawnSync("docker", ["inspect", "--format={{.State.Running}}", containerName], {
    cwd: root,
    encoding: "utf8",
    env: environment,
    timeout: 5_000,
    windowsHide: true,
  });

  if (result.error || result.status !== 0 || result.stdout.trim() !== "true") {
    throw new Error(
      "Lead concurrency verification requires the local database container to be running.",
    );
  }
}

function runSql(sql, label, timeout = 10_000) {
  const result = spawnSync("docker", psqlArguments, {
    cwd: root,
    encoding: "utf8",
    env: environment,
    input: sql,
    maxBuffer: maximumCapturedOutput,
    timeout,
    windowsHide: true,
  });

  if (result.error || result.status !== 0) {
    throw new Error(`${label} failed; local database output was suppressed.`);
  }

  return result.stdout.trim();
}

function appendBounded(current, chunk) {
  return `${current}${chunk}`.slice(-maximumCapturedOutput);
}

function startSqlSession() {
  const child = spawn("docker", psqlArguments, {
    cwd: root,
    env: environment,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  const session = {
    child,
    error: false,
    exited: false,
    stderr: "",
    stdout: "",
  };

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    session.stdout = appendBounded(session.stdout, chunk);
  });
  child.stderr.on("data", (chunk) => {
    session.stderr = appendBounded(session.stderr, chunk);
  });
  child.stdin.on("error", () => {
    session.error = true;
  });

  session.completion = new Promise((resolveCompletion) => {
    child.once("error", () => {
      session.error = true;
      session.exited = true;
      resolveCompletion({ code: null, signal: null });
    });
    child.once("close", (code, signal) => {
      session.exited = true;
      resolveCompletion({ code, signal });
    });
  });

  return session;
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, milliseconds);
  });
}

async function waitForCondition(predicate, timeout, label) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await delay(25);
  }

  throw new Error(`${label} timed out.`);
}

async function waitForCompletion(session, timeout, label) {
  let timeoutHandle;
  const timeoutResult = new Promise((resolveTimeout) => {
    timeoutHandle = setTimeout(() => resolveTimeout(null), timeout);
  });
  const result = await Promise.race([session.completion, timeoutResult]);
  clearTimeout(timeoutHandle);

  if (result === null) {
    throw new Error(`${label} timed out.`);
  }

  return result;
}

function writeSession(session, sql, closeInput = false) {
  if (session.exited || session.error || !session.child.stdin.writable) {
    throw new Error("A local database test session ended unexpectedly.");
  }

  if (closeInput) {
    session.child.stdin.end(sql);
  } else {
    session.child.stdin.write(sql);
  }
}

const claims = `select set_config('request.jwt.claims', json_build_object('sub', '${actorId}', 'role', 'authenticated', 'aal', 'aal2')::text, false);`;

function cleanupFixture() {
  runSql(
    `begin;
set local lock_timeout = '3s';
set local statement_timeout = '5s';
delete from public.lead_events where lead_id = '${fixtureId}';
delete from public.lead_stage_history where lead_id = '${fixtureId}';
delete from public.leads where id = '${fixtureId}';
delete from public.clients where referral_source = 'Lead ${fixtureReference}';
delete from public.user_roles where user_id = '${actorId}';
delete from auth.users where id = '${actorId}';
commit;
`,
    "Synthetic conversion-race fixture cleanup",
  );
}

function terminateTestSessions() {
  runSql(
    `set statement_timeout = '5s';
select pg_terminate_backend(pid)
from pg_stat_activity
where application_name in ('${deleteSessionName}', '${finalizeSessionName}')
  and pid <> pg_backend_pid();
`,
    "Concurrency-session cleanup",
  );
}

function readWaitState() {
  const result = runSql(
    `set statement_timeout = '2s';
select case
  when exists (
    select 1
    from pg_stat_activity
    where application_name = '${finalizeSessionName}'
      and state = 'active'
      and wait_event_type = 'Lock'
  ) then 'locked'
  when exists (
    select 1
    from pg_stat_activity
    where application_name = '${finalizeSessionName}'
  ) then 'present'
  else 'missing'
end;
`,
    "Concurrency wait-state probe",
    5_000,
  );

  return result.split(/\r?\n/u).at(-1);
}

async function stopClient(session) {
  if (!session || session.exited) {
    return;
  }

  try {
    session.child.kill();
    await waitForCompletion(session, 2_000, "Local database client shutdown");
  } catch {
    // The database backend is terminated separately; do not expose process output.
  }
}

/**
 * C8 conversion race: two staff sessions convert the same lead to a client at
 * the same time. Session A holds the row lock inside its transaction; session
 * B must wait, then observe the existing link (already_linked) instead of
 * creating a second client.
 */
async function main() {
  let sessionA;
  let sessionB;
  let verificationError;
  const cleanupErrors = [];

  try {
    inspectLocalDatabaseContainer();
    cleanupFixture();
    runSql(
      `begin;
set local statement_timeout = '5s';
insert into auth.users (id) values ('${actorId}');
update public.profiles set account_status = 'active', version = version + 1 where id = '${actorId}';
insert into public.user_roles (user_id, role_id) select '${actorId}', id from public.roles where key = 'admin';
insert into public.leads (id, reference, lead_type, source_channel, full_name, email, email_normalized, summary)
values ('${fixtureId}', '${fixtureReference}', 'general', 'manual', 'SYNTHETIC race lead', 'synthetic-race@example.test', 'synthetic-race@example.test', 'SYNTHETIC race');
commit;
`,
      "Synthetic conversion-race fixture setup",
    );

    sessionA = startSqlSession();
    writeSession(
      sessionA,
      `set application_name = '${deleteSessionName}';
begin;
set local lock_timeout = '5s';
set local statement_timeout = '15s';
set local idle_in_transaction_session_timeout = '20s';
${claims}
select public.convert_lead_to_client('${fixtureId}', 1) ->> 'created';
\\echo ${marker}
`,
    );
    await waitForCondition(
      () => sessionA.stdout.includes(marker) || sessionA.exited,
      8_000,
      "Conversion A lock acquisition",
    );
    if (
      !sessionA.stdout.includes(marker) ||
      sessionA.exited ||
      !/\btrue\b/u.test(sessionA.stdout)
    ) {
      throw new Error(
        "Conversion session A did not create the client while holding the lead lock.",
      );
    }

    sessionB = startSqlSession();
    writeSession(
      sessionB,
      `set application_name = '${finalizeSessionName}';
begin;
set local lock_timeout = '10s';
set local statement_timeout = '15s';
${claims}
select public.convert_lead_to_client('${fixtureId}', 1) ->> 'already_linked';
commit;
`,
      true,
    );

    const waitDeadline = Date.now() + 6_000;
    let observedLock = false;
    while (Date.now() < waitDeadline && !sessionB.exited) {
      if (readWaitState() === "locked") {
        observedLock = true;
        break;
      }
      await delay(100);
    }
    if (!observedLock) {
      throw new Error("Conversion B did not observably wait on the lead row lock.");
    }

    writeSession(sessionA, "commit;\n", true);
    const resultA = await waitForCompletion(sessionA, 8_000, "Conversion A commit");
    if (sessionA.error || resultA.code !== 0) {
      throw new Error("Conversion A did not commit cleanly.");
    }
    const resultB = await waitForCompletion(sessionB, 8_000, "Conversion B");
    if (sessionB.error || resultB.code !== 0 || !/\btrue\b/u.test(sessionB.stdout)) {
      throw new Error("Conversion B did not return the existing link after waiting.");
    }

    const finalState = runSql(
      `set statement_timeout = '5s';
select (select count(*) from public.clients where referral_source = 'Lead ${fixtureReference}')::text
  || ':' || (select count(*) from public.leads where id = '${fixtureId}' and client_id is not null)::text;
`,
      "Final conversion state probe",
    );
    if (finalState.split(/\r?\n/u).at(-1) !== "1:1") {
      throw new Error("The conversion race produced an unexpected client/link count.");
    }
  } catch (error) {
    verificationError = error;
  } finally {
    await stopClient(sessionA);
    await stopClient(sessionB);
    try {
      terminateTestSessions();
    } catch (error) {
      cleanupErrors.push(error);
    }
    try {
      cleanupFixture();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }

  if (verificationError) {
    throw verificationError;
  }
  if (cleanupErrors.length > 0) {
    throw cleanupErrors[0];
  }

  console.log(
    "Lead conversion race verification passed: concurrent conversions serialized on the lead row and produced exactly one client.",
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Lead conversion race verification failed.",
  );
  process.exit(1);
});
