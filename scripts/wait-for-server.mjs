// Waits until a local server answers 200 (default http://127.0.0.1:3100/).
//   node scripts/wait-for-server.mjs [url] [attempts]
// Exits through exitCode, never process.exit(): on Windows, exiting while
// fetch's sockets are still closing aborts Node with a libuv assertion.
const url = process.argv[2] ?? "http://127.0.0.1:3100/";
const attempts = Number(process.argv[3] ?? 40);

async function main() {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      const body = await response.text();
      // 503 from /api/health is the server answering "blocked" (e.g. the
      // test-only switches set on the browser-test server); it is up.
      if (response.status === 200 || (response.status === 503 && body.includes('"dependencies"'))) {
        console.log("up", url);
        return 0;
      }
    } catch {
      // not yet
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  console.error("server did not answer:", url);
  return 1;
}

process.exitCode = await main();
