import { chromium } from "playwright";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await chromium.launch({
  headless: !process.argv.includes("--headed"),
  executablePath: chromePath
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(() => {
    localStorage.setItem("artflow-pos.v2.authToken", "qa-token");
    localStorage.setItem("artflow-pos.v2.sessionUser", JSON.stringify({
      id: "qa-admin",
      name: "QA Admin",
      email: "qa@example.com",
      role: "admin",
      status: "active"
    }));
  });
  await page.route("https://artflow-pos-api.ptlocnguyen.workers.dev/", route => route.abort("failed"));
  await page.goto(pathToFileURL(path.join(root, "pages", "dashboard.html")).href, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);

  const result = await page.evaluate(() => ({
    href: location.href,
    status: document.querySelector(".sidebar-card")?.dataset.connectionStatus || "",
    sidebarText: document.querySelector(".sidebar-card")?.textContent || ""
  }));

  if (result.href.includes("index.html")) {
    throw new Error("Network failure redirected the user to login.");
  }
  if (result.status !== "offline") {
    throw new Error(`Expected offline status, received "${result.status}". Sidebar: ${result.sidebarText}`);
  }

  console.log("Connection resilience QA passed.");
} finally {
  await browser.close();
}
