import { chromium } from "@playwright/test";

const paths = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ["/"];
const browser = await chromium.launch();
const page = await browser.newPage();
const messages = [];
page.on("console", (msg) => {
  if (msg.type() === "warning" || msg.type() === "error") {
    messages.push(`[${msg.type()}] ${msg.text()}`);
  }
});
page.on("pageerror", (error) => {
  messages.push(`[pageerror] ${error.message}`);
});

for (const path of paths) {
  await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
}

await browser.close();
if (messages.length === 0) {
  console.log("No console warnings or errors.");
} else {
  console.log(messages.join("\n"));
}
