import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { createArtflowFixture } from "./fixtures/artflow-test-state.mjs";

const headed = process.argv.includes("--headed");
const keepScreenshots = !process.argv.includes("--no-screenshots");
const root = process.cwd();
const apiUrl = "https://artflow-pos-api.ptlocnguyen.workers.dev";
const token = "qa-token";
const storageKey = "artflow-pos.v2";
const screenshotRoot = path.join(root, "test-artifacts", "screenshots");
const reportRoot = path.join(root, "test-artifacts", "reports");
const requestedPage = process.argv.find(argument => argument.startsWith("--page="))?.split("=")[1] || "";
const requestedViewport = process.argv.find(argument => argument.startsWith("--viewport="))?.split("=")[1] || "";

const allPages = [
  ["auth", "index.html"],
  ["orders", "pages/orders.html"],
  ["order-create", "pages/order-create.html"],
  ["products", "pages/products.html"],
  ["channels", "pages/channels.html"],
  ["channel-settings", "pages/channel-settings.html"],
  ["content", "pages/content.html"],
  ["team", "pages/team.html"],
  ["team-pricing", "pages/team-pricing.html"],
  ["meeting-minutes", "pages/meeting-minutes.html"],
  ["incense", "pages/incense.html"],
  ["customers", "pages/customers.html"],
  ["inventory", "pages/inventory.html"],
  ["accounting", "pages/accounting.html"],
  ["accounting-settings", "pages/accounting-settings.html"],
  ["purchasing", "pages/purchasing.html"],
  ["suppliers", "pages/suppliers.html"],
  ["purchase-create", "pages/purchase-create.html"],
  ["reports", "pages/reports.html"],
  ["users", "pages/users.html"],
  ["settings", "pages/settings.html"],
  ["activity", "pages/activity.html"]
];
const pages = requestedPage ? allPages.filter(([name]) => name === requestedPage) : allPages;
if (!pages.length) throw new Error(`Unknown smoke page: ${requestedPage}`);

const allViewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 }
];
const viewports = requestedViewport ? allViewports.filter(viewport => viewport.name === requestedViewport) : allViewports;
if (!viewports.length) throw new Error(`Unknown smoke viewport: ${requestedViewport}`);

await mkdir(reportRoot, { recursive: true });
if (keepScreenshots) {
  await rm(screenshotRoot, { recursive: true, force: true });
  await mkdir(screenshotRoot, { recursive: true });
}

const browser = await chromium.launch({
  headless: !headed,
  executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
});

const report = {
  startedAt: new Date().toISOString(),
  viewports: viewports.map(({ name, width, height }) => ({ name, width, height })),
  pages: [],
  apiCalls: [],
  failures: []
};

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  await context.addInitScript(({ storageKey, token }) => {
    localStorage.setItem(`${storageKey}.authToken`, token);
  }, { storageKey, token });

  for (const [name, relativeFile] of pages) {
    const state = createArtflowFixture();
    if (name === "purchase-create") {
      const samples = [...state.products];
      for (let index = samples.length; index < 30; index += 1) {
        const source = samples[index % samples.length];
        state.products.push({
          ...source,
          id: `purchase-picker-product-${index + 1}`,
          sku: `${source.sku}-QA-${String(index + 1).padStart(2, "0")}`,
          name: `${source.name} - Phiên bản kiểm tra tên sản phẩm dài ${index + 1}`,
          stock: index % 6 === 0 ? 0 : 10 + index
        });
      }
    }
    const page = await context.newPage();
    if (name === "auth") {
      await page.addInitScript(storageKey => {
        localStorage.removeItem(`${storageKey}.authToken`);
      }, storageKey);
    }
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", message => {
      if (["error", "warning"].includes(message.type())) {
        consoleErrors.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", error => pageErrors.push(error.stack || error.message));
    await installApiMock(page, state);

    const url = pathToFileURL(path.join(root, relativeFile)).href;
    const started = Date.now();
    let result;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(
        name === "auth" ? "[data-login-form] input[name='email']" : "[data-app-shell]:not([hidden])",
        { timeout: 8000 }
      );
      await page.waitForTimeout(250);
      await runPageInteractions(page, name, viewport.name);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.body.classList.contains("context-open"));
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(60);
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        const overflowing = [...document.querySelectorAll("body *")].filter(element => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.right > window.innerWidth + 2;
        }).slice(0, 6).map(element => ({
          tag: element.tagName.toLowerCase(),
          className: element.className || "",
          text: (element.textContent || "").trim().slice(0, 80),
          right: Math.round(element.getBoundingClientRect().right)
        }));
        return {
          title: document.querySelector("[data-page-title]")?.textContent?.trim() || document.title,
          scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
          clientWidth: doc.clientWidth,
          scrollHeight: Math.max(doc.scrollHeight, body.scrollHeight),
          clientHeight: doc.clientHeight,
          horizontalOverflow: Math.max(doc.scrollWidth, body.scrollWidth) > doc.clientWidth + 2,
          overflowing
        };
      });
      const screenshot = keepScreenshots
        ? await saveScreenshot(page, viewport.name, name)
        : "";
      result = {
        page: name,
        viewport: viewport.name,
        ok: !metrics.horizontalOverflow && consoleErrors.length === 0 && pageErrors.length === 0,
        durationMs: Date.now() - started,
        screenshot,
        metrics,
        consoleErrors,
        pageErrors
      };
    } catch (error) {
      result = {
        page: name,
        viewport: viewport.name,
        ok: false,
        durationMs: Date.now() - started,
        screenshot: "",
        error: error.message,
        consoleErrors,
        pageErrors
      };
    }
    report.pages.push(result);
    if (!result.ok) report.failures.push(result);
    await page.close();
  }
  await context.close();
}

await browser.close();
report.finishedAt = new Date().toISOString();
await writeFile(path.join(reportRoot, "smoke-report.json"), JSON.stringify(report, null, 2), "utf8");

if (report.failures.length) {
  console.error(`Smoke QA failed: ${report.failures.length} issue(s). See test-artifacts/reports/smoke-report.json`);
  process.exit(1);
}

console.log(`Smoke QA passed for ${report.pages.length} page/viewport checks.`);

async function saveScreenshot(page, viewportName, pageName) {
  const dir = path.join(screenshotRoot, viewportName);
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, `${pageName}.png`);
  await page.screenshot({ path: target, fullPage: false });
  return path.relative(root, target).replace(/\\/g, "/");
}

async function runPageInteractions(page, pageName, viewportName) {
  if (viewportName === "mobile" && !["auth", "purchase-create"].includes(pageName)) {
    await page.locator("[data-context-toggle]").click().catch(() => {});
    if (!(await page.locator("body").getAttribute("class") || "").includes("context-open")) throw new Error("Mobile context navigation must open from the command bar.");
    await page.keyboard.press("Escape");
  }
  if (["orders", "products", "customers"].includes(pageName)) {
    const rowSelector = pageName === "orders" ? "[data-orders-table] [data-view-order]" : pageName === "products" ? '[data-products-table] [data-view-product="prod-001"]' : "[data-customers-table] [data-view-customer]";
    await page.locator(rowSelector).first().click();
    const expectedType = pageName === "orders" ? "orderDetail" : pageName === "products" ? "productDetail" : "customerDetail";
    await page.locator(`[data-modal-type='${expectedType}']`).waitFor();
    if (pageName === "products") {
      const detailText = await page.locator("[data-modal-type='productDetail']").innerText();
      if (!["Nhà cung cấp đã nhập", "Art Supplies VN", "12.000"].every(value => detailText.includes(value))) {
        throw new Error("Product detail must expose its received supplier and latest purchase cost.");
      }
      if (keepScreenshots && ["desktop", "mobile"].includes(viewportName)) {
        const dir = path.join(screenshotRoot, viewportName);
        await mkdir(dir, { recursive: true });
        if (viewportName === "mobile") {
          await page.locator("[data-modal-type='productDetail'] .section-heading-inline", { hasText: "Nhà cung cấp đã nhập" }).scrollIntoViewIfNeeded();
        }
        await page.screenshot({ path: path.join(dir, "products-supplier-history.png"), fullPage: false });
      }
    }
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.querySelector("[data-modal-backdrop]")?.hidden === true);
  }
  if (pageName === "products") {
    const productCount = page.locator("[data-product-result-count]");
    await page.locator("[data-global-search]").fill("ART002");
    await page.waitForTimeout(60);
    if ((await productCount.innerText()).trim() !== "1") throw new Error("Product search must filter the catalog by SKU.");
    await page.locator("[data-global-search]").fill("");
    await page.locator("[data-product-stock-filter]").selectOption("low");
    await page.waitForTimeout(60);
    if (Number(await productCount.innerText()) < 1) throw new Error("Product stock filter must return low-stock products.");
    await page.locator("[data-product-stock-filter]").selectOption("all");
    await page.locator("[data-popover-trigger='#product-filter-popover']").click();
    if (!(await page.locator("#product-filter-popover").isVisible())) throw new Error("Advanced product filters must open from the catalog toolbar.");
    if (keepScreenshots) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "products-advanced-filters.png"), fullPage: false });
    }
    await page.locator("[data-reset-product-filters]").click();
    await page.keyboard.press("Escape");

    const assertProductEditorFits = async label => {
      const modal = page.locator(".modal[data-modal-type='product']");
      await modal.waitFor();
      const metrics = await modal.evaluate(element => {
        const form = element.querySelector("[data-modal-form]");
        const rect = element.getBoundingClientRect();
        return {
          modalClientWidth: element.clientWidth,
          modalScrollWidth: element.scrollWidth,
          formClientWidth: form?.clientWidth || 0,
          formScrollWidth: form?.scrollWidth || 0,
          left: rect.left,
          right: rect.right,
          viewportWidth: window.innerWidth
        };
      });
      if (metrics.modalScrollWidth > metrics.modalClientWidth + 2) throw new Error(`${label} must not overflow its modal horizontally.`);
      if (metrics.formScrollWidth > metrics.formClientWidth + 2) throw new Error(`${label} form must not overflow horizontally.`);
      if (metrics.left < -2 || metrics.right > metrics.viewportWidth + 2) throw new Error(`${label} must remain inside the viewport.`);
      if (["desktop", "desktop-1280"].includes(viewportName) && metrics.modalClientWidth < 1180) throw new Error(`${label} should use the available desktop width.`);
    };

    await page.locator("[data-open-product]").click();
    await assertProductEditorFits("Product creation workspace");
    if (keepScreenshots) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "products-create.png"), fullPage: false });
    }
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.querySelector("[data-modal-backdrop]")?.hidden === true);

    await page.locator("[data-edit-product]").first().click();
    await assertProductEditorFits("Product editing workspace");
    if (!(await page.locator("[data-modal-form] input[name='sku']").inputValue()).trim()) throw new Error("Product editing workspace must load the selected product.");
    if (keepScreenshots) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "products-edit.png"), fullPage: false });
    }
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.querySelector("[data-modal-backdrop]")?.hidden === true);
  }
  if (pageName === "inventory") {
    const resultCount = page.locator("[data-inventory-result-count]");
    await page.locator("[data-global-search]").fill("ART002");
    await page.waitForTimeout(60);
    if ((await resultCount.innerText()).trim() !== "1") throw new Error("Inventory search must filter the SKU control table.");
    await page.locator("[data-global-search]").fill("");
    await page.locator('[data-inventory-filter="stock"]').selectOption("low");
    await page.waitForTimeout(60);
    if (Number(await resultCount.innerText()) < 1) throw new Error("Inventory risk filter must return low-stock SKUs.");
    await page.locator("[data-reset-inventory-filters]").click();
    await page.locator("[data-open-inventory-movements]").click();
    const movementOverlay = page.locator("[data-inventory-movements-overlay]");
    if (!(await movementOverlay.isVisible())) throw new Error("Inventory movement history must open in a modal overlay.");
    if (await page.locator("[data-stock-movements-table] tr").count() < 1) throw new Error("Inventory movement modal must render history rows.");
    if (keepScreenshots) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "inventory-movements.png"), fullPage: false });
    }
    await page.keyboard.press("Escape");
    if (await movementOverlay.isVisible()) throw new Error("Inventory movement history must close with Escape.");
  }
  if (pageName === "content") {
    const resultCount = page.locator("[data-content-result-count]");
    await page.locator("[data-global-search]").fill("chu de khong ton tai QA");
    await page.waitForTimeout(60);
    if ((await resultCount.innerText()).trim() !== "0") throw new Error("Content search must filter the topic table.");
    await page.locator("[data-global-search]").fill("");
    await page.locator("[data-popover-trigger='#content-filter-popover']").click();
    const filterPopover = page.locator("#content-filter-popover");
    if (!(await filterPopover.isVisible())) throw new Error("Advanced content filters must open from the catalog toolbar.");
    await page.locator('[data-content-filter="type"]').selectOption("campaign");
    await page.waitForTimeout(60);
    if (Number(await resultCount.innerText()) < 1) throw new Error("Content type filter must return matching topics.");
    if (keepScreenshots) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "content-filters.png"), fullPage: false });
    }
    await page.locator("[data-reset-content-filters]").click();
    await page.keyboard.press("Escape");
    await page.locator("[data-open-content-item]").click();
    const contentModal = page.locator("[data-modal-type='contentItem']");
    await contentModal.waitFor();
    if (!(await page.locator("#contentTitle").isVisible())) throw new Error("Content creation workspace must expose the topic title field.");
    if (!(await page.locator("[data-content-template]").isVisible())) throw new Error("Content creation workspace must expose brief automation templates.");
    const modalMetrics = await contentModal.evaluate(element => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
    if (modalMetrics.scrollWidth > modalMetrics.clientWidth + 2) throw new Error("Content creation workspace must not overflow horizontally.");
    if (keepScreenshots) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "content-create.png"), fullPage: false });
    }
    await page.locator("[data-close-modal]").first().click();
    const download = page.waitForEvent("download", { timeout: 3000 });
    await page.locator("[data-export-content]").click();
    await download;
  }
  if (pageName === "activity") {
    const resultCount = page.locator("[data-audit-result-count]");
    await page.locator("[data-audit-range-filter]").selectOption("all");
    await page.waitForTimeout(60);
    if (Number(await resultCount.innerText()) < 1) throw new Error("Activity history must expose older records when the full range is selected.");
    await page.locator("[data-audit-entity-filter]").selectOption("order");
    await page.waitForTimeout(60);
    if ((await resultCount.innerText()).trim() !== "1") throw new Error("Activity entity filter must isolate order history.");
    await page.locator("[data-global-search]").fill("createOrder");
    await page.waitForTimeout(60);
    if ((await resultCount.innerText()).trim() !== "1") throw new Error("Activity search must find records by action code.");
    await page.locator("[data-view-audit]").first().click();
    const detailModal = page.locator("[data-modal-type='auditDetail']");
    await detailModal.waitFor();
    if (!(await detailModal.innerText()).includes("Dữ liệu ghi nhận")) throw new Error("Activity details must expose the recorded payload.");
    if (keepScreenshots) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "activity-detail.png"), fullPage: false });
    }
    await page.locator("[data-close-modal]").first().click();
    await page.locator("[data-global-search]").fill("");
    await page.locator("[data-audit-entity-filter]").selectOption("all");
    await page.locator("[data-refresh-audit]").click();
    await page.waitForTimeout(100);
    if (Number(await resultCount.innerText()) < 1) throw new Error("Refreshing activity history must preserve loaded records.");
    if (viewportName === "desktop") {
      const tableHeight = await page.locator(".audit-table-wrap").evaluate(element => element.getBoundingClientRect().height);
      if (tableHeight < 500) throw new Error("Activity table must expand into the remaining desktop workspace.");
    }
  }
  if (pageName === "reports") {
    const resultCount = page.locator("[data-report-result-count]");
    await page.locator("[data-report-range]").selectOption("all");
    await page.waitForTimeout(80);
    if ((await resultCount.innerText()).trim() !== "1 dòng") throw new Error("Business report must list paid sales in the selected period.");

    await page.locator('[data-report-view="products"]').click();
    if (await page.evaluate(() => window.scrollX !== 0)) throw new Error("Switching report tabs must not move the page horizontally.");
    if (Number.parseInt(await resultCount.innerText(), 10) < 1) throw new Error("Product report must show sold products.");
    if (!(await page.locator("[data-product-profit-table] tr").first().innerText()).includes("ART")) throw new Error("Product report must include SKU details.");
    if (keepScreenshots && ["desktop", "mobile"].includes(viewportName)) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "reports-products.png"), fullPage: false });
    }

    await page.locator('[data-report-view="channels"]').click();
    if (Number.parseInt(await resultCount.innerText(), 10) < 1) throw new Error("Channel report must show active sales channels.");

    await page.locator('[data-report-view="expenses"]').click();
    if (await page.evaluate(() => window.scrollX !== 0)) throw new Error("Expense report must remain aligned with the viewport.");
    if (Number.parseInt(await resultCount.innerText(), 10) < 1) throw new Error("Expense report must show operating expenses.");
    if (keepScreenshots && ["desktop", "mobile"].includes(viewportName)) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "reports-expenses.png"), fullPage: false });
    }

    const download = page.waitForEvent("download", { timeout: 3000 });
    await page.locator("[data-export-profit-report]").click();
    await download;
    if (!(await page.locator("[data-export-profit-report]").isVisible())) throw new Error("Report export action must remain visible after download.");

    await page.locator('[data-report-view="business"]').click();
    if (!(await page.locator("[data-report-heading]").innerText()).includes("Kinh doanh")) throw new Error("Report heading must follow the selected report type.");
    if (viewportName === "desktop") {
      const tableHeight = await page.locator(".report-table-panel:not([hidden]) .table-wrap").evaluate(element => element.getBoundingClientRect().height);
      if (tableHeight < 500) throw new Error("Report table must expand into the remaining desktop workspace.");
      const workspaceFit = await page.evaluate(() => {
        const workspace = document.querySelector(".workspace").getBoundingClientRect();
        const report = document.querySelector(".report-workspace").getBoundingClientRect();
        return { available: workspace.width, report: report.width };
      });
      if (workspaceFit.available - workspaceFit.report > 50) throw new Error("Report workspace must use the full available desktop width.");
    }
  }
  if (pageName === "users") {
    const resultCount = page.locator("[data-user-result-count]");
    if ((await resultCount.innerText()).trim() !== "3") throw new Error("Staff workspace must show the loaded account count.");
    const currentRow = page.locator("[data-users-table] tr", { hasText: "admin@artflow.local" });
    if (await currentRow.locator("[data-toggle-user], [data-delete-user]").count()) throw new Error("The current admin account must not expose destructive actions.");
    await page.locator("[data-global-search]").fill("Minh Anh");
    await page.waitForTimeout(60);
    if ((await resultCount.innerText()).trim() !== "1") throw new Error("Staff search must filter accounts by name.");
    await page.locator("[data-global-search]").fill("");
    await page.locator("[data-user-role-filter]").selectOption("inventory");
    await page.waitForTimeout(60);
    if ((await resultCount.innerText()).trim() !== "1") throw new Error("Staff role filter must isolate inventory accounts.");
    await page.locator("[data-user-role-filter]").selectOption("all");

    await page.locator("[data-open-user]").click();
    const userModal = page.locator("[data-modal-type='user']");
    await userModal.waitFor();
    if (!(await userModal.innerText()).includes("Chọn quyền tối thiểu cần thiết")) throw new Error("Staff creation must explain role permissions.");
    if (keepScreenshots) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "users-create.png"), fullPage: false });
    }
    await page.locator("#name").fill("QA Staff");
    await page.locator("#email").fill("qa.staff@artflow.local");
    await page.locator("#password").fill("QaStaff123!");
    await page.locator("#role").selectOption("viewer");
    await page.locator("[data-modal-form] button[type='submit']").click();
    await page.waitForTimeout(120);
    if ((await resultCount.innerText()).trim() !== "4") throw new Error("Creating a staff account must refresh the account list.");

    const salesRow = page.locator("[data-users-table] tr", { hasText: "content@artflow.local" });
    await salesRow.locator("[data-toggle-user]").click();
    await page.waitForTimeout(120);
    await page.locator("[data-user-status-filter]").selectOption("disabled");
    await page.waitForTimeout(60);
    if ((await resultCount.innerText()).trim() !== "1") throw new Error("Locking an account must update the status filter immediately.");
    await page.locator("[data-user-status-filter]").selectOption("all");

    const qaRow = page.locator("[data-users-table] tr", { hasText: "qa.staff@artflow.local" });
    page.once("dialog", dialog => dialog.accept());
    await qaRow.locator("[data-delete-user]").click();
    await page.waitForTimeout(120);
    if ((await resultCount.innerText()).trim() !== "3") throw new Error("Deleting a staff account must remove it from the list.");
    if (viewportName === "desktop") {
      const tableHeight = await page.locator(".users-table-wrap").evaluate(element => element.getBoundingClientRect().height);
      if (tableHeight < 500) throw new Error("Staff table must expand into the remaining desktop workspace.");
    }
  }
  if (pageName === "team") {
    const captureTeamState = async name => {
      if (!keepScreenshots || !["desktop", "mobile"].includes(viewportName)) return;
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, `team-${name}.png`), fullPage: false });
    };
    if (await page.locator("[data-team-range-filter]").inputValue() !== "all") throw new Error("Team Hub must show all historical records by default.");
    if (!await page.locator("[data-team-view='meetings']").isVisible()) throw new Error("Meeting workspace tab must remain available.");
    if (!await page.locator("[data-team-content]").getByText("Map SKU Shopee", { exact: false }).isVisible()) throw new Error("Historical standalone tasks must remain visible.");
    if (!await page.locator("[data-team-content]").getByText("Chot bang gia combo", { exact: false }).isVisible()) throw new Error("Meeting action items must appear in the shared task workspace.");
    await page.locator("[data-team-view='meetings']").click();
    if (!await page.locator("[data-team-content]").getByText("Hop ke hoach thang 7", { exact: false }).isVisible()) throw new Error("Saved meetings must render in Team Hub.");
    if (!String(await page.locator("[data-team-primary-action]").innerText()).includes("Cuộc họp")) throw new Error("Meeting tab must expose its own primary action.");
    await captureTeamState("meetings");
    await page.locator("[data-team-view='plans']").click();
    if (!await page.locator("[data-team-content]").getByText("Ke hoach Back to School", { exact: false }).isVisible()) throw new Error("Business plans must render in Team Hub.");
    if (!await page.locator("[data-team-content]").getByText("18.000.000", { exact: false }).isVisible()) throw new Error("Legacy plan revenue must remain visible after normalization.");
    await captureTeamState("plans");
    await page.locator("[data-team-primary-action]").click();
    if (!await page.locator("#teamPlanTitle").isVisible()) throw new Error("Plan creation must open the plan form.");
    await captureTeamState("plan-create");
    await page.keyboard.press("Escape");
    await page.locator("[data-team-view='decisions']").click();
    if (!await page.locator("[data-team-content]").getByText("Giu gia but chi 2B", { exact: false }).isVisible()) throw new Error("Saved decisions must render in Team Hub.");
    if (!await page.locator("[data-team-content]").getByText("Gia ban 8.000d", { exact: false }).isVisible()) throw new Error("Legacy decision details must remain visible after normalization.");
    await captureTeamState("decisions");
    await page.locator("[data-team-primary-action]").click();
    if (!await page.locator("#teamDecisionTitle").isVisible()) throw new Error("Decision creation must open the decision form.");
    await captureTeamState("decision-create");
    await page.keyboard.press("Escape");
    await page.locator("[data-team-view='tasks']").click();
    await page.locator("[data-team-primary-action]").click();
    await page.locator("#taskTitle").fill("QA kiem tra workflow task");
    await page.locator("[data-modal-form] button[type='submit']").click();
    await page.locator("[data-modal-backdrop][hidden], .modal-backdrop[hidden]").waitFor({ timeout: 1500 }).catch(() => {});
    const createdTask = page.locator(".team-task-card", { hasText: "QA kiem tra workflow task" });
    await createdTask.locator("[data-edit-workspace-task]").click();
    if (await page.locator("#taskTitle").inputValue() !== "QA kiem tra workflow task") throw new Error("Editing a task must restore its saved values.");
    await page.keyboard.press("Escape");
    page.once("dialog", dialog => dialog.accept());
    await createdTask.locator("[data-archive-workspace-task]").click();
    await page.locator(".team-task-card", { hasText: "QA kiem tra workflow task" }).waitFor({ state: "detached", timeout: 1500 });
    await page.waitForTimeout(100);
    if (viewportName === "desktop") {
      const dimensions = await page.locator(".team-workspace").evaluate(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }));
      if (dimensions.width < 1000 || dimensions.height < 700) throw new Error("Team Hub must use the remaining desktop workspace.");
    }
  }
  if (pageName === "meeting-minutes") {
    if (!await page.locator("[data-minutes-list]").getByText("Hop ke hoach thang 7", { exact: false }).isVisible()) throw new Error("Meeting minutes workspace must retain saved meetings.");
    const minutesDateDisplay = page.locator(".localized-date-input:has(#minutesAt) .localized-date-display");
    if (!(await minutesDateDisplay.count())) throw new Error("Meeting date-time input must use the Vietnamese date control.");
    await page.locator("#minutesAt").fill("2026-08-15T09:05");
    await page.locator("#minutesAt").dispatchEvent("change");
    if (await minutesDateDisplay.inputValue() !== "15/08/2026 09:05") throw new Error("Native date-time picker changes must display in Vietnamese order.");
    await minutesDateDisplay.fill("15/08/2026 14:30");
    await minutesDateDisplay.blur();
    if (await page.locator("#minutesAt").inputValue() !== "2026-08-15T14:30") throw new Error("Vietnamese date-time input must preserve the ISO value used by the API.");
    if (viewportName === "mobile") {
      const listStyle = await page.locator("[data-minutes-list]").evaluate(element => ({ display: getComputedStyle(element).display, overflowX: getComputedStyle(element).overflowX }));
      if (listStyle.display !== "flex" || listStyle.overflowX !== "auto") throw new Error("Mobile meeting history must use a compact horizontal strip.");
    }
    await page.locator("#minutesTitle").fill("QA bien ban hop nhanh");
    await page.locator("[data-minutes-template='planning']").click().catch(() => {});
    await page.locator("[data-minutes-quick-note]").fill("Chot: mo shop TikTok trong tuan nay\nViec: Ngoc Hoa chuan bi logo truoc 2026-07-12\nhttps://drive.google.com/demo");
    await page.locator("[data-minutes-parse-quick]").click().catch(() => {});
    if (await page.locator("[data-minutes-decisions-list] [data-minutes-decision-row]").count() < 1) throw new Error("Quick meeting notes must create structured decisions.");
    if (await page.locator("[data-minutes-actions-list] [data-minutes-action-row]").count() < 1) throw new Error("Quick meeting notes must create structured follow-up tasks.");
    if (await page.locator("[data-minutes-links-list] [data-minutes-link-row]").count() < 1) throw new Error("Quick meeting notes must retain related links.");
    await page.locator("[data-meeting-minutes-form] button[type='submit']").click().catch(() => {});
    await page.waitForTimeout(100);
    if (!await page.locator("[data-minutes-list]").getByText("QA bien ban hop nhanh", { exact: false }).isVisible()) throw new Error("Saved meeting minutes must return to the meeting history.");
  }
  if (pageName === "channels") {
    const tiktokBar = page.locator("[data-tiktok-connection]");
    if (!(await tiktokBar.isVisible())) throw new Error("TikTok Shop connection status must remain visible on the channel workspace.");
    if (!(await page.locator("[data-tiktok-sync-catalog]").isVisible())) throw new Error("Connected TikTok Shop must expose SKU reconciliation.");
    if (!(await page.locator("[data-tiktok-sync-inventory]").isVisible())) throw new Error("Connected TikTok Shop must expose inventory sync.");
    const count = page.locator("[data-omni-result-count]");
    if ((await count.innerText()).trim() !== "5 SKU") throw new Error("Channel workspace must show the initial product count.");
    await page.locator("[data-global-search]").fill("SHP-ART001");
    if ((await count.innerText()).trim() !== "1 SKU") throw new Error("Channel search must find mappings by marketplace SKU.");
    await page.locator("[data-global-search]").fill("Shopee ArtFlow");
    if ((await count.innerText()).trim() !== "1 SKU") throw new Error("Channel search must find mappings by channel name.");
    await page.locator("[data-global-search]").fill("");
    await page.locator("[data-omni-quick-filter='missing']").click();
    if ((await count.innerText()).trim() !== "3 SKU") throw new Error("Unmapped quick filter must show products without channel mappings.");
    await page.locator("[data-omni-quick-filter='mismatch']").click();
    if ((await count.innerText()).trim() !== "2 SKU") throw new Error("Stock mismatch quick filter must show inconsistent channel stock.");
    await page.locator("[data-omni-quick-filter='reserved']").click();
    if ((await count.innerText()).trim() !== "1 SKU") throw new Error("Reserved stock quick filter must show reserved products.");
    await page.locator("[data-omni-quick-filter='all']").click();
    await page.locator("[data-omni-channel-filter]").selectOption("channel-shopee");
    if ((await count.innerText()).trim() !== "1 SKU") throw new Error("Channel selector must filter products mapped to the selected channel.");
    await page.locator("[data-omni-channel-filter]").selectOption("all");
    const tableWrap = page.locator(".channels-table-wrap");
    const tableMetrics = await tableWrap.evaluate(element => ({ height: element.getBoundingClientRect().height, overflowY: getComputedStyle(element).overflowY }));
    if (viewportName === "desktop" && tableMetrics.height < 500) throw new Error(`Channel table must use the remaining desktop workspace height (actual: ${Math.round(tableMetrics.height)}px).`);
    if (viewportName === "mobile" && ["auto", "scroll"].includes(tableMetrics.overflowY)) throw new Error("Channel cards must use natural page scrolling on mobile.");
    await page.locator("[data-omni-table] [data-open-channel-product-form][data-product-id='prod-001']").click();
    const mappingModal = page.locator("[data-modal-type='channelProduct']");
    await mappingModal.waitFor();
    if (await page.locator("#productId").inputValue() !== "prod-001") throw new Error("Mapping action must open the selected internal product.");
    if (await page.locator("#channelId").inputValue() !== "channel-shopee") throw new Error("Mapping action must load the product's existing channel mapping.");
    await page.locator("#channelId").selectOption("channel-tiktok");
    if (await page.locator("[data-modal-form] input[name='id']").inputValue()) throw new Error("Changing to an unmapped channel must prepare a new product-channel pair.");
    await page.locator("#channelSku").fill("QA-SKU-001");
    if (keepScreenshots) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "channels-mapping.png"), fullPage: false });
    }
    await page.locator("[data-modal-form] button[type='submit']").click();
    await page.waitForFunction(() => document.querySelector("[data-modal-backdrop]")?.hidden === true);
    if (!(await page.locator("[data-omni-table] [data-open-channel-product-form][data-product-id='prod-001']").count())) throw new Error("Saved channel mapping must keep the product available in the workspace.");
    const download = page.waitForEvent("download", { timeout: 3000 });
    await page.locator("[data-export-omni]").click();
    await download;
  }
  if (pageName === "channel-settings") {
    if (!(await page.locator("[data-channel-settings-list] .channel-setting-row").count())) throw new Error("Channel settings must render configured sales channels.");
    await page.locator("[data-channel-settings-search]").fill("Shopee");
    if (await page.locator("[data-channel-settings-list] .channel-setting-row").count() !== 1) throw new Error("Channel settings search must filter the management list.");
    await page.locator("[data-channel-settings-search]").fill("");
  }
  if (pageName === "accounting-settings") {
    const anchors = page.locator(".settings-anchor-nav a");
    if (await anchors.count() !== 3) throw new Error("Accounting settings must expose all three configuration groups.");
    for (const link of await anchors.all()) {
      if (!(await link.isVisible())) throw new Error("Every accounting settings group must remain visible without horizontal scrolling.");
    }
    if (viewportName === "desktop") {
      const fit = await page.evaluate(() => {
        const workspace = document.querySelector(".workspace").getBoundingClientRect();
        const settings = document.querySelector(".accounting-settings-page").getBoundingClientRect();
        return workspace.width - settings.width;
      });
      if (fit > 50) throw new Error("Accounting settings must use the full available desktop width.");
    }

    await page.locator("a[href='#categories']").click();
    await page.waitForTimeout(80);
    if (!(await page.locator("a[href='#categories']").getAttribute("class") || "").includes("active")) throw new Error("Accounting settings navigation must mark the selected group.");

    await page.locator("a[href='#commerce-rules']").click();
    await page.waitForTimeout(80);
    const settingsForm = page.locator("[data-accounting-settings-form]");
    await settingsForm.locator("input[name='tolerance']").fill("2500");
    await settingsForm.locator("input[name='payrollKeywords']").fill("lương, cộng tác viên, payroll, thưởng");
    await settingsForm.locator("button[type='submit']").click();
    await page.waitForTimeout(120);
    if (!(await page.locator("[data-toast]").innerText()).includes("Đã lưu cấu hình")) throw new Error("Accounting rules must save through the backend flow.");

    await page.locator("a[href='#accounts']").click();
    await page.waitForTimeout(80);
  }
  if (pageName === "suppliers") {
    const count = page.locator("[data-supplier-result-count]");
    if ((await count.innerText()).trim() !== "1 nhà cung cấp") throw new Error("Supplier workspace must show the initial result count.");
    await page.locator("[data-global-search]").fill("không tồn tại");
    await page.waitForTimeout(80);
    if ((await count.innerText()).trim() !== "0 nhà cung cấp") throw new Error("Supplier search must update the result list and count.");
    await page.locator("[data-global-search]").fill("");
    await page.locator("[data-supplier-balance-filter]").selectOption("payable").catch(() => {});
    await page.waitForTimeout(80);
    const tableWrap = page.locator(".supplier-table-wrap");
    const tableMetrics = await tableWrap.evaluate(element => ({ height: element.getBoundingClientRect().height, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, overflowY: getComputedStyle(element).overflowY }));
    if (viewportName === "desktop" && tableMetrics.height < 600) throw new Error(`Supplier table must use the remaining desktop workspace height (actual: ${Math.round(tableMetrics.height)}px).`);
    if (viewportName === "mobile" && ["auto", "scroll"].includes(tableMetrics.overflowY)) throw new Error("Supplier cards must use natural page scrolling on mobile.");
    if (["tablet", "mobile"].includes(viewportName) && tableMetrics.scrollWidth > tableMetrics.clientWidth + 2) throw new Error("Supplier cards must not overflow horizontally.");
    const supplierRow = page.locator("[data-supplier-card]").first();
    const supplierText = await supplierRow.innerText();
    if (!["090000001", "2 sản phẩm", "1.800.000", "800.000"].every(value => supplierText.includes(value))) throw new Error("Responsive supplier cards must retain contact, supplied-product, purchase and balance information.");
    const productFilter = page.locator("[data-supplier-product-filter]");
    await productFilter.selectOption("prod-001");
    if ((await count.innerText()).trim() !== "1 nhà cung cấp") throw new Error("Supplier product filter must find suppliers that received the selected SKU.");
    await productFilter.selectOption("all");
    await page.locator("[data-global-search]").fill("ART002");
    await page.waitForTimeout(60);
    if ((await count.innerText()).trim() !== "1 nhà cung cấp") throw new Error("Supplier search must include products previously received from that supplier.");
    await page.locator("[data-global-search]").fill("");
    await page.locator("button[data-supplier-card]").first().click();
    const detail = page.locator("[data-supplier-detail]:not([hidden])");
    await detail.waitFor();
    const detailText = await detail.innerText();
    if (!["Thông tin liên hệ", "sales@supplier.local", "Sản phẩm đã nhập", "But chi 2B Faber Castell", "12.000", "Phiếu mua gần đây", "PO-20260624-0001"].every(value => detailText.includes(value))) throw new Error("Supplier detail must include contact, supplied-product statistics and recent purchasing information.");
    if (detailText.includes("Bang pha mau nhua")) throw new Error("Draft purchase items must not appear in received supplier history.");
    const historySearch = detail.locator("[data-supplier-product-history-search]");
    await historySearch.fill("ART002");
    if ((await detail.locator("[data-supplier-product-history-count]").innerText()).trim() !== "1") throw new Error("Supplier product history search must narrow the visible SKU list.");
    await historySearch.fill("");
    if (keepScreenshots && ["desktop", "mobile"].includes(viewportName)) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "suppliers-detail.png"), fullPage: false });
    }
    await page.locator("[data-close-management-drawer]").click();
    await page.locator("button[data-edit-supplier]").first().click();
    await page.locator("[data-modal-backdrop]:not([hidden])").waitFor();
    const supplierForm = page.locator("[data-modal-form]");
    if (await supplierForm.locator("input[name='name']").inputValue() !== "Art Supplies VN") throw new Error("Supplier edit form must load the selected profile.");
    const supplierModalOverflow = await page.locator("[data-modal-backdrop] .modal").evaluate(element => element.scrollWidth - element.clientWidth);
    if (supplierModalOverflow > 2) throw new Error(`Supplier edit form must not overflow horizontally (${supplierModalOverflow}px).`);
    if (keepScreenshots && ["desktop", "mobile"].includes(viewportName)) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "suppliers-edit.png"), fullPage: false });
    }
    await page.locator("[data-close-modal]").first().click();
  }
  if (pageName === "purchasing") {
    const count = page.locator("[data-purchase-result-count]");
    if ((await count.innerText()).trim() !== "2 phiếu") throw new Error("Purchasing workspace must show the initial purchase order count.");
    await page.locator("[data-global-search]").fill("PO-DRAFT-001");
    await page.waitForTimeout(60);
    if ((await count.innerText()).trim() !== "1 phiếu") throw new Error("Purchase search must find an order by code.");
    await page.locator("[data-global-search]").fill("");
    await page.locator("[data-purchase-saved-view='draft']").click();
    if ((await count.innerText()).trim() !== "1 phiếu") throw new Error("Draft purchase saved view must only show waiting orders.");
    await page.locator("[data-purchase-saved-view='all']").click();
    await page.locator("[data-purchase-status-filter]").selectOption("received");
    if ((await count.innerText()).trim() !== "1 phiếu") throw new Error("Purchase status filter must show received orders.");
    await page.locator("[data-purchase-payment-filter]").selectOption("partial");
    if ((await count.innerText()).trim() !== "1 phiếu") throw new Error("Purchase payment filter must combine with status filtering.");
    await page.locator("[data-purchase-status-filter]").selectOption("all");
    await page.locator("[data-purchase-payment-filter]").selectOption("all");
    const tableWrap = page.locator(".purchasing-table-wrap");
    const tableMetrics = await tableWrap.evaluate(element => ({ height: element.getBoundingClientRect().height, overflowY: getComputedStyle(element).overflowY, scrollTop: element.scrollTop }));
    if (viewportName === "desktop" && tableMetrics.height < 500) throw new Error(`Purchase table must use the remaining desktop workspace height (actual: ${Math.round(tableMetrics.height)}px).`);
    if (viewportName === "mobile" && ["auto", "scroll"].includes(tableMetrics.overflowY)) throw new Error("Purchase cards must use natural page scrolling on mobile.");
    await page.locator("[data-purchase-order-row='po-001']").click();
    await page.locator("[data-purchase-detail]:not([hidden])").waitFor();
    const detailText = await page.locator("[data-purchase-detail]:not([hidden])").innerText();
    if (!detailText.includes("1.800.000") || !detailText.includes("ART")) throw new Error("Purchase detail must show totals and purchased item information.");
    if (keepScreenshots) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "purchasing-detail.png"), fullPage: false });
    }
    await page.locator("[data-close-management-drawer]").click();
    if (viewportName === "mobile" && await tableWrap.evaluate(element => element.scrollTop !== 0)) throw new Error("Closing purchase detail must not leave the mobile list internally scrolled.");
  }
  if (pageName === "order-create") {
    await page.locator("[data-open-product-picker], [data-show-product-picker], [data-product-picker-open]").first().click({ timeout: 1200 }).catch(() => {});
    await page.waitForTimeout(100);
  }
  if (pageName === "purchase-create") {
    const backButton = page.locator(".purchase-back-button");
    if (!(await backButton.isVisible()) || !String(await backButton.getAttribute("href")).includes("purchasing.html")) {
      throw new Error("Purchase creation must provide a clear route back to the purchase list.");
    }
    const dueDateDisplay = page.locator(".localized-date-input:has(#dueDate) .localized-date-display");
    if (!(await dueDateDisplay.count())) throw new Error("Purchase due date must use the Vietnamese date control.");
    await page.locator("#dueDate").fill("2026-11-09");
    await page.locator("#dueDate").dispatchEvent("change");
    if (await dueDateDisplay.inputValue() !== "09/11/2026") throw new Error("Native date picker changes must display in Vietnamese order.");
    await dueDateDisplay.fill("31/12/2026");
    await dueDateDisplay.blur();
    if (await page.locator("#dueDate").inputValue() !== "2026-12-31") throw new Error("Vietnamese date input must preserve the ISO value used by the API.");
    if (await page.locator(".purchase-items-section > .purchase-product-picker").count()) {
      throw new Error("The product catalog must not consume space in the main purchase form.");
    }
    if (keepScreenshots && ["desktop", "mobile"].includes(viewportName)) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "purchase-create-top.png"), fullPage: false });
    }
    const purchaseScroll = await page.evaluate(() => ({
      overflowY: getComputedStyle(document.body).overflowY,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    if (purchaseScroll.overflowY === "hidden") throw new Error("Purchase creation page must not lock vertical scrolling.");
    if (purchaseScroll.scrollWidth > purchaseScroll.clientWidth + 2) throw new Error("Purchase creation page must not overflow horizontally.");
    await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.dataset.purchaseScrollProbe = "";
      probe.style.height = "420px";
      document.querySelector("[data-purchase-create-form]")?.appendChild(probe);
    });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(80);
    if (await page.evaluate(() => window.scrollY <= 0)) throw new Error("Purchase creation page must scroll to its supplier and submit sections.");
    await page.locator("[data-purchase-scroll-probe]").evaluate(element => element.remove());
    if (!(await page.locator("[data-purchase-create-form] button[type='submit']").isVisible())) throw new Error("Purchase submit action must remain reachable after scrolling.");
    if (keepScreenshots && ["desktop", "mobile"].includes(viewportName)) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "purchase-create-bottom.png"), fullPage: false });
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator("[data-open-purchase-product-picker]").first().click();
    const productPopup = page.locator("[data-purchase-product-popup]:not([hidden])");
    await productPopup.waitFor();
    if (await productPopup.locator("[data-add-product-to-purchase]").count() !== 30) {
      throw new Error("Purchase product picker fixture must cover a realistic 30-product catalog.");
    }
    const popupOverflow = await productPopup.locator(".purchase-product-popup-panel").evaluate(element => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth
    }));
    if (popupOverflow.scrollWidth > popupOverflow.clientWidth + 2) throw new Error("Purchase product picker must not overflow horizontally.");
    if (viewportName === "desktop" && popupOverflow.width < 900) throw new Error("Purchase product picker should use a wide desktop dialog.");
    const overflowingProductCards = await productPopup.locator("[data-add-product-to-purchase]").evaluateAll(cards => cards.filter(card => card.scrollHeight > card.clientHeight + 1).map(card => card.textContent.trim().slice(0, 80)));
    if (overflowingProductCards.length) throw new Error(`Purchase product cards must contain all content without overlap: ${overflowingProductCards.join(" | ")}`);
    const categoryFilter = productPopup.locator("[data-purchase-product-category]");
    if (await categoryFilter.locator("option").count() > 1) {
      await categoryFilter.selectOption({ index: 1 });
      if (!(await productPopup.locator("[data-add-product-to-purchase]:visible").count())) throw new Error("Purchase category filter must retain matching products.");
      await productPopup.locator("[data-reset-purchase-product-picker]").click();
    }
    const stockFilter = productPopup.locator("[data-purchase-product-stock]");
    const thresholdLabels = productPopup.locator(".purchase-stock-threshold");
    if (await thresholdLabels.count() !== 30) throw new Error("Every purchase product must show its safe-stock threshold.");
    if (!(await thresholdLabels.first().textContent()).includes("Ngưỡng")) throw new Error("Purchase safe-stock thresholds must have a clear Vietnamese label.");
    await stockFilter.selectOption("low");
    const lowStockCards = productPopup.locator('[data-add-product-to-purchase][data-product-low-stock="true"]:visible');
    if (!(await lowStockCards.count())) throw new Error("Purchase stock filter must expose products at or below their reorder threshold.");
    if (await productPopup.locator('[data-add-product-to-purchase][data-product-low-stock="false"]:visible').count()) {
      throw new Error("Purchase low-stock filter must hide products above their reorder threshold.");
    }
    if (keepScreenshots && ["desktop", "mobile"].includes(viewportName)) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "purchase-create-low-stock-filter.png"), fullPage: false });
    }
    await productPopup.locator("[data-reset-purchase-product-picker]").click();
    const supplierHistoryFilter = productPopup.locator("[data-purchase-product-supplier]");
    await supplierHistoryFilter.selectOption("current");
    if (await productPopup.locator('[data-add-product-to-purchase][data-product-supplier-match="true"]:visible').count() !== 2) {
      throw new Error("Purchase picker must only show products received from the selected supplier.");
    }
    if (await productPopup.locator('[data-add-product-to-purchase="prod-004"]:visible').count()) {
      throw new Error("Products found only in draft purchases must not be treated as supplier history.");
    }
    await productPopup.locator("[data-reset-purchase-product-picker]").click();
    const selectedProduct = productPopup.locator('[data-add-product-to-purchase="prod-001"]');
    const selectedProductId = await selectedProduct.getAttribute("data-add-product-to-purchase");
    if (!(await selectedProduct.locator("[data-purchase-supplier-history]").innerText()).includes("12.000")) {
      throw new Error("Purchase product cards must show the supplier's latest received cost.");
    }
    await selectedProduct.click();
    const selectedCard = productPopup.locator(`[data-add-product-to-purchase="${selectedProductId}"]`);
    if (!(await selectedCard.isDisabled()) || !(await selectedCard.getAttribute("class")).includes("is-selected")) {
      throw new Error("Products already added to the purchase must be visibly marked and protected from duplicates.");
    }
    if (keepScreenshots && ["desktop", "mobile"].includes(viewportName)) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "purchase-create-product-picker.png"), fullPage: false });
    }
    await productPopup.locator("[data-close-purchase-product-picker]").last().click();
    if (await page.locator("[data-purchase-product-popup]:not([hidden])").count()) throw new Error("Purchase product picker must close from its completion action.");
    const purchaseItems = page.locator("[data-purchase-items]");
    if (await purchaseItems.locator("[data-purchase-item-row]").count() !== 1) throw new Error("Selecting a product must create exactly one purchase line.");
    if (await purchaseItems.locator("[data-purchase-cost]").first().inputValue() !== "12000") {
      throw new Error("Adding a known supplier product must default to its latest received cost.");
    }
    if (keepScreenshots && ["desktop", "mobile"].includes(viewportName)) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "purchase-create-selected-item.png"), fullPage: false });
    }
    const internalScroll = await purchaseItems.evaluate(element => {
      const source = element.querySelector("[data-purchase-item-row]");
      for (let index = 0; index < 12; index += 1) {
        const clone = source.cloneNode(true);
        clone.dataset.purchaseScrollClone = "";
        element.appendChild(clone);
      }
      return { scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, overflowY: getComputedStyle(element).overflowY };
    });
    if (internalScroll.scrollHeight <= internalScroll.clientHeight || !["auto", "scroll"].includes(internalScroll.overflowY)) {
      throw new Error("A long purchase item list must use its own vertical scrollbar.");
    }
    await page.locator("[data-purchase-scroll-clone]").evaluateAll(elements => elements.forEach(element => element.remove()));
    const unitCost = page.locator("[data-purchase-cost]").first();
    await unitCost.fill("11200");
    const isValidCost = await unitCost.evaluate(input => input.validity.valid);
    if (!isValidCost) throw new Error("Purchase unit cost 11200 must be accepted as a valid VND value.");
    await page.locator("[data-purchase-create-form] button[type='submit']").click();
    await page.waitForTimeout(150);
  }
  if (pageName === "team-pricing") {
    await page.evaluate(() => window.history.replaceState(null, "", "?productId=prod-001"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("[data-team-pricing-page-form]").waitFor();
    if (await page.locator("[data-team-pricing-product]").inputValue() !== "prod-001") {
      throw new Error("Pricing page productId query must preselect the requested product.");
    }
    if (await page.locator("[data-pricing-channel-field]").isVisible()) {
      throw new Error("Pricing channel selector must stay hidden for offline pricing.");
    }
    if (!(await page.locator("#teamPricingTitle").inputValue()).includes("Shop/POS offline")) {
      throw new Error("Pricing title must identify the offline target.");
    }
    await page.locator("[data-open-pricing-product-picker]").click();
    await page.locator("[data-product-picker-search]").fill("ART001");
    if (!(await page.locator("[data-select-pricing-product]:visible").count())) throw new Error("Pricing picker must find products by SKU.");
    await page.locator("[data-product-picker-search]").fill("Bút chì");
    await page.locator("[data-select-pricing-product]:visible").first().click();
    const costValue = Number(await page.locator("#teamPricingBaseCost").inputValue());
    if (!costValue) throw new Error("Pricing product picker must update base cost from the selected product.");
    const selectedText = await page.locator("[data-pricing-selected-product]").innerText();
    if (!selectedText.includes("Giá vốn")) throw new Error("Pricing page must show the selected product cost summary.");
    const selectedProductName = (await page.locator("[data-pricing-selected-product] strong").innerText()).trim();
    if (!(await page.locator("#teamPricingTitle").inputValue()).includes(selectedProductName)) {
      throw new Error("Changing the pricing product must update the pricing title.");
    }
    await page.locator("#teamPricingBaseCost").fill("10000");
    const validBaseCost = await page.locator("#teamPricingBaseCost").evaluate(input => input.validity.valid);
    if (!validBaseCost) throw new Error("Pricing base cost must accept exact VND values, not only 1.000d steps.");
    const firstScenario = page.locator("[data-pricing-scenario-row]").first();
    await firstScenario.locator("[data-pricing-scenario-margin]").fill("20");
    await firstScenario.locator("[data-pricing-scenario-profit]").fill("0");
    await firstScenario.locator("[data-pricing-scenario-price]").fill("0");
    await firstScenario.locator("[data-pricing-scenario-rounding]").selectOption("none");
    const validScenarioPrice = await firstScenario.locator("[data-pricing-scenario-price]").evaluate(input => input.validity.valid);
    if (!validScenarioPrice) throw new Error("Pricing scenario manual price must accept exact VND values.");

    while (await page.locator("[data-pricing-line-row] [data-remove-pricing-row]").count()) {
      await page.locator("[data-pricing-line-row] [data-remove-pricing-row]").first().click();
    }
    const addCost = async (name, type, value, included = true) => {
      await page.locator("[data-add-pricing-line]").click();
      const row = page.locator("[data-pricing-line-row]").last();
      await row.locator("[data-pricing-line-name]").fill(name);
      await row.locator("[data-pricing-line-type]").selectOption(type);
      if (type !== "note") await row.locator("[data-pricing-line-value]").fill(String(value));
      if (!included) await row.locator(".pricing-row-toggle").click();
    };
    await addCost("Đóng gói", "fixed", 1000);
    await addCost("Nhân công", "cost_percent", 10);
    await addCost("Phí thanh toán", "price_percent", 5);
    await addCost("Ghi chú QA", "note", 99999);
    await addCost("Không tính", "fixed", 5000, false);
    await page.waitForTimeout(80);
    const pricingResultText = await page.locator("[data-pricing-result]").first().innerText();
    if (!pricingResultText.includes("16.000") || !pricingResultText.includes("20.0%")) {
      throw new Error("Pricing formula must include fixed, cost-percent and sale-price-percent costs while ignoring notes and excluded rows.");
    }

    await page.locator("[data-add-pricing-line]").click();
    await page.locator("[data-pricing-line-row]").last().locator("[data-pricing-line-name]").fill("QA phí đóng gói");
    await page.locator("[data-add-pricing-scenario]").click();
    const secondScenario = page.locator("[data-pricing-scenario-row]").last();
    await secondScenario.locator("[data-pricing-scenario-name]").fill("QA giá thử");
    await secondScenario.locator("[data-pricing-scenario-price]").fill("20000");
    await secondScenario.locator("[data-pricing-scenario-rounding]").selectOption("none");
    await secondScenario.locator("[data-select-pricing-scenario]").check();
    await page.locator("[data-pricing-line-row]").last().locator("[data-remove-pricing-row]").click();
    await page.locator("[data-open-pricing-product-picker]").click();
    await page.locator('[data-product-picker-filter="price"]').selectOption("missing");
    const missingPriceCards = page.locator("[data-select-pricing-product]:visible");
    if (await missingPriceCards.count()) {
      const invalidPriceState = await missingPriceCards.evaluateAll(cards => cards.some(card => card.dataset.priceState !== "missing"));
      if (invalidPriceState) throw new Error("Pricing picker price-status filter returned a product with an existing shop price.");
    } else if (!(await page.locator("[data-product-picker-empty]").isVisible())) {
      throw new Error("Pricing picker must show a valid empty state when no product is missing a shop price.");
    }
    await page.locator("[data-product-picker-search]").fill("khong-co-san-pham-nao");
    const emptyVisible = await page.locator("[data-product-picker-empty]").isVisible();
    if (!emptyVisible) throw new Error("Pricing product picker must show an empty state when filters return no product.");
    await page.locator("[data-close-modal]").first().click();
    await page.locator("[data-pricing-result]").filter({ hasText: "QA giá thử" }).locator('[data-apply-pricing-target="offline"]').click();
    await page.waitForTimeout(180);
    if (!(await page.locator("#teamPricingBaseCost").inputValue())) throw new Error("Applying product price must not reset the pricing form.");
    await page.locator("#teamPricingTarget").selectOption("channel");
    if (!(await page.locator("[data-pricing-channel-field]").isVisible())) throw new Error("Channel selector must appear only for channel pricing.");
    const channelOptionsText = await page.locator("#teamPricingChannel").innerText();
    if (!channelOptionsText.includes("Shopee") || !channelOptionsText.includes("TikTok") || channelOptionsText.includes("POS cửa hàng") || channelOptionsText.includes("Lazada")) {
      throw new Error("Pricing channel selector must prioritize Shopee and TikTok without POS or unused default channels.");
    }
    await page.locator("#teamPricingChannel").selectOption("channel-shopee");
    if (!(await page.locator("#teamPricingTitle").inputValue()).includes("Shopee")) {
      throw new Error("Pricing title must update when the target channel changes.");
    }
    await page.locator("[data-pricing-result]").filter({ hasText: "QA giá thử" }).locator('[data-apply-pricing-target="channel"]').click();
    await page.waitForTimeout(180);
    await page.locator("[data-team-pricing-page-form] button[type='submit']").click();
    await page.waitForTimeout(180);
    const currentUrl = page.url();
    if (!currentUrl.includes("id=")) throw new Error("Saving pricing page must keep the user on the saved pricing record.");
    await page.locator("#teamPricingTarget").selectOption("offline");
    if (await page.locator("[data-pricing-channel-field]").isVisible()) throw new Error("Switching back to offline pricing must hide the channel selector again.");
    if (!(await page.locator("#teamPricingTitle").inputValue()).includes("Shop/POS offline")) throw new Error("Switching back to offline pricing must update the pricing title.");
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  if (pageName === "purchasing") {
    const hasXlsx = await page.evaluate(() => Boolean(window.XLSX));
    if (!hasXlsx) throw new Error("Purchasing page must load XLSX before enabling purchase order Excel export.");
    const exportButton = page.locator("[data-export-purchase-order]").first();
    if (!(await exportButton.count())) throw new Error("Purchasing page must render per-order Excel export actions.");
    const receiveButton = page.locator("[data-receive-purchase]").first();
    if (await receiveButton.count()) {
      const hasReceiveColor = await receiveButton.evaluate(button => button.classList.contains("action-receive"));
      if (!hasReceiveColor) throw new Error("Receive purchase action must have a distinct visual style.");
    }
  }
  if (pageName === "settings") {
    await page.locator("#storeName").fill("ArtFlow QA");
    await page.locator("#legalName").fill("Hộ kinh doanh ArtFlow QA");
    await page.locator("#taxCode").fill("0312345678");
    await page.locator("[data-settings-form] button[type='submit']").click();
    await page.waitForTimeout(150);
    const previewText = await page.locator("[data-settings-preview]").innerText();
    if (!previewText.includes("Hộ kinh doanh ArtFlow QA")) throw new Error("Settings preview must reflect saved shop legal information.");
  }
  if (pageName === "accounting") {
    const dir = path.join(screenshotRoot, viewportName);
    await mkdir(dir, { recursive: true });
    for (const view of ["payouts", "ledger", "receivables", "payroll", "tax"]) {
      await page.locator(`[data-accounting-view-filter='${view}']`).evaluate(element => element.click());
      await page.waitForTimeout(80);
      await page.evaluate(() => window.scrollTo(0, 0));
      if (view === "payouts") {
        if (!(await page.locator("[data-platform-payout-table] tr").count())) throw new Error("Payout table must render reconciliation records.");
        await page.locator("[data-open-platform-payout]").click();
        await page.locator("#payoutCode").fill(`QA-${Date.now()}`);
        await page.locator("#grossAmount").fill("100000");
        await page.locator("#totalFees").fill("10000");
        await page.locator("#expectedAmount").fill("90000");
        await page.locator("#actualAmount").fill("90000");
        await page.locator("[data-modal-form] button[type='submit']").click();
        await page.waitForTimeout(120);
        if (!(await page.locator("[data-platform-payout-table]").innerText()).includes("QA-")) throw new Error("Creating a payout must update the payout table.");
      }
      if (view === "ledger") {
        await page.locator("[data-accounting-range-filter]").selectOption("all");
        const ledger = page.locator("[data-accounting-transactions-table]");
        if (viewportName === "desktop" && !(await ledger.locator("xpath=ancestor::table").innerText()).toLocaleUpperCase("vi-VN").includes("CHỨNG TỪ")) throw new Error("Cash ledger must include the document column.");
        const transactionActions = page.locator("[data-edit-cash-transaction]");
        if (await transactionActions.count() !== await ledger.locator("tr").count()) throw new Error("Every cash transaction must expose one consistent edit action.");
        if ((await transactionActions.first().getAttribute("title")) !== "Chỉnh sửa giao dịch") throw new Error("Cash transaction action must be labelled as edit, not document upload.");

        await page.locator("[data-edit-cash-transaction='tx-002']").click();
        await page.locator("#documentUrl").fill("https://drive.google.com/file/d/qa-accounting-document/view");
        await page.locator("[data-modal-form] button[type='submit']").click();
        await page.waitForTimeout(120);
        if (!(await ledger.innerText()).includes("Mở file")) throw new Error("Updating a transaction document must refresh the ledger.");

        await page.locator("[data-edit-cash-transaction='tx-003']").click();
        await page.locator("#amount").fill("125000");
        await page.locator("#description").fill("QA cập nhật chi phí quảng cáo");
        await page.locator("#documentUrl").fill("https://drive.google.com/file/d/qa-manual-transaction/view");
        if (keepScreenshots && ["desktop", "mobile"].includes(viewportName)) await page.screenshot({ path: path.join(dir, "accounting-transaction-edit.png"), fullPage: false });
        await page.locator("[data-modal-form] button[type='submit']").click();
        await page.waitForTimeout(120);
        const updatedManualRow = page.locator("[data-transaction-row='tx-003']");
        if (!(await updatedManualRow.innerText()).includes("125.000") || !(await updatedManualRow.innerText()).includes("QA cập nhật chi phí quảng cáo")) throw new Error("Editing a manual cash transaction must refresh all changed ledger values.");
        await page.locator("[data-accounting-type-select]").selectOption("expense");
        if (!(await page.locator("[data-accounting-ledger-count]").innerText()).includes("giao dịch phù hợp")) throw new Error("Ledger must show the filtered transaction count.");
        if ((await ledger.innerText()).includes("Thu bán hàng")) throw new Error("Expense filter must hide income transactions.");
        await page.locator("[data-accounting-type-select]").selectOption("all");
        await page.locator("[data-open-accounting-ledger-analysis]").click();
        const availableBalanceText = await page.locator("[data-ledger-available-balance] strong").innerText();
        const accountBalanceTexts = await page.locator(".ledger-account-balances article > b").allInnerTexts();
        const parseDisplayedMoney = value => Number(String(value || "").replace(/[^\d-]/g, "")) || 0;
        const displayedAccountTotal = accountBalanceTexts.reduce((sum, value) => sum + parseDisplayedMoney(value), 0);
        const hasAnalysisSections = await page.locator("[data-ledger-available-balance], .ledger-account-section, .ledger-expense-section").count() === 3;
        const parsedAvailableBalance = parseDisplayedMoney(availableBalanceText);
        if (!hasAnalysisSections || parsedAvailableBalance !== displayedAccountTotal) throw new Error(`Ledger analysis must expose a current available balance equal to the displayed account balances (sections:${hasAnalysisSections}; total:${parsedAvailableBalance}/${displayedAccountTotal}; ${availableBalanceText}; ${accountBalanceTexts.join(" | ")}).`);
        const analysisOverflow = await page.locator(".modal[data-modal-type='accountingLedgerAnalysis']").evaluate(element => element.scrollWidth - element.clientWidth);
        if (analysisOverflow > 2) throw new Error(`Ledger analysis must not overflow horizontally (${analysisOverflow}px).`);
        if (keepScreenshots) await page.screenshot({ path: path.join(dir, "accounting-ledger-analysis.png"), fullPage: false });
        await page.locator("[data-close-modal]").first().click();
        await page.locator("[data-accounting-account-filter]").selectOption("acc-bank");
        await page.locator("[data-open-accounting-ledger-analysis]").click();
        const filteredAvailableBalance = parseDisplayedMoney(await page.locator("[data-ledger-available-balance] strong").innerText());
        const filteredAccountBalance = parseDisplayedMoney(await page.locator(".ledger-account-balances article > b").innerText());
        if (await page.locator(".ledger-account-balances article").count() !== 1 || filteredAvailableBalance !== filteredAccountBalance) throw new Error("Ledger analysis balance must follow the selected account while remaining independent from the time range.");
        await page.locator("[data-close-modal]").first().click();
        await page.locator("[data-accounting-account-filter]").selectOption("all");
      }
      if (view === "receivables") {
        await page.locator("[data-accounting-debt-view='supplier']").click();
        const payable = page.locator("[data-supplier-payable-order='po-001']");
        if (!(await payable.innerText()).includes("800.000")) throw new Error("Supplier payable must show the purchase order outstanding balance.");
        if (await page.locator("[data-supplier-payable-order='po-draft-001']").count()) throw new Error("Draft purchase orders must not be payable from accounting.");
        await payable.locator("[data-accounting-pay-purchase]").click();
        if (keepScreenshots) await page.screenshot({ path: path.join(dir, "accounting-supplier-payment-modal.png"), fullPage: false });
        await page.locator("#amount").fill("400000");
        await page.locator("[data-modal-form] button[type='submit']").click();
        await page.waitForTimeout(160);
        if (!(await payable.innerText()).includes("400.000")) throw new Error("Partial supplier payment must keep the remaining payable visible.");
        if (keepScreenshots) await page.screenshot({ path: path.join(dir, "accounting-supplier-payable-partial.png"), fullPage: false });
        await payable.locator("[data-accounting-pay-purchase]").click();
        if (Number((await page.locator("#amount").inputValue()).replaceAll(".", "")) !== 400000) throw new Error("The next payment must default to the remaining balance.");
        await page.locator("[data-modal-form] button[type='submit']").click();
        await page.waitForTimeout(160);
        if (await page.locator("[data-supplier-payable-order='po-001']").count()) throw new Error("Fully paid purchase order must leave the supplier payable list.");
        if (!(await page.locator("[data-toast]").innerText()).includes("Xem giao dịch kế toán")) throw new Error("Payment success must expose the accounting transaction link.");
      }
      const exportButton = page.locator(`[data-accounting-section='${view}'] [data-open-accounting-export]:visible`).first();
      if (await exportButton.count()) {
        await exportButton.click().catch(() => {});
        await page.waitForTimeout(50);
        await page.locator("[data-close-modal]").first().click().catch(() => {});
        await page.waitForTimeout(220);
      }
      if (keepScreenshots) {
        await page.screenshot({ path: path.join(dir, `accounting-${view}.png`), fullPage: false });
      }
    }
    const deepLinkUrl = new URL(page.url());
    deepLinkUrl.searchParams.set("transactionId", "tx-002");
    await page.goto(deepLinkUrl.toString(), { waitUntil: "networkidle" });
    if (!(await page.locator("[data-accounting-view-filter='ledger']").getAttribute("class") || "").includes("active")) throw new Error("Accounting deep link must open the ledger view.");
    if (!(await page.locator("[data-transaction-row='tx-002']").getAttribute("class") || "").includes("deep-link-highlight")) throw new Error("Accounting deep link must highlight the transaction.");

    const accountingUrl = page.url();
    const menuToggle = page.locator("[data-context-toggle]");
    if (await menuToggle.isVisible()) {
      await menuToggle.click();
      await page.waitForTimeout(250);
      if (!(await page.locator("body").getAttribute("class") || "").includes("context-open")) {
        throw new Error("Accounting context menu must remain open after the menu action.");
      }
    }
    const accountingSettingsLink = page.locator(".context-nav a[href='./accounting-settings.html']");
    if (!(await accountingSettingsLink.isVisible())) throw new Error("Accounting menu must expose the settings action.");
    await accountingSettingsLink.scrollIntoViewIfNeeded();
    const settingsLinkLayout = await accountingSettingsLink.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const nav = element.closest(".context-nav");
      const sidebar = element.closest(".context-sidebar");
      return {
        rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
        nav: nav ? { clientHeight: nav.clientHeight, scrollHeight: nav.scrollHeight, scrollTop: nav.scrollTop } : null,
        sidebarTransform: sidebar ? getComputedStyle(sidebar).transform : "",
        contextOpen: document.body.classList.contains("context-open")
      };
    });
    if (settingsLinkLayout.rect.right <= 0 || settingsLinkLayout.rect.left >= await page.evaluate(() => innerWidth)) {
      throw new Error(`Accounting settings action must enter the viewport: ${JSON.stringify(settingsLinkLayout)}`);
    }
    await accountingSettingsLink.click();
    await page.waitForURL(/accounting-settings\.html/);
    await page.locator("[data-page-title]").waitFor();
    if (!(await page.locator("[data-page-title]").innerText()).includes("Thiết lập kế toán")) throw new Error("Accounting settings menu action must open the correct workspace.");
    await page.goto(new URL("./activity.html", accountingUrl).toString(), { waitUntil: "networkidle" });
    await page.locator("[data-audit-range-filter]").selectOption("all");
    await page.locator("[data-audit-entity-filter]").selectOption("cash_transaction");
    if (!(await page.locator("[data-audit-table]").innerText()).includes("Cập nhật giao dịch thu chi")) throw new Error("Editing a cash transaction must appear in activity history.");
    await page.locator("[data-view-audit]").first().click();
    const cashAuditDetail = page.locator("[data-modal-type='auditDetail']");
    if (!(await cashAuditDetail.innerText()).includes('"before"') || !(await cashAuditDetail.innerText()).includes('"result"')) throw new Error("Cash transaction audit detail must preserve before and after values.");
    await page.locator("[data-close-modal]").first().click();
    if (keepScreenshots && ["desktop", "mobile"].includes(viewportName)) {
      const dir = path.join(screenshotRoot, viewportName);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, "accounting-transaction-audit.png"), fullPage: false });
    }
    await page.goto(accountingUrl, { waitUntil: "networkidle" });
  }
  if (pageName === "purchasing") {
    const deepLinkUrl = new URL(page.url());
    deepLinkUrl.searchParams.set("purchaseOrderId", "po-001");
    await page.goto(deepLinkUrl.toString(), { waitUntil: "networkidle" });
    if (!(await page.locator("[data-purchase-order-row='po-001']").getAttribute("class") || "").includes("deep-link-highlight")) throw new Error("Purchasing deep link must highlight the purchase order.");
  }
  if (pageName === "incense") {
    await page.locator("[data-incense-kind-choice='team']").click().catch(() => {});
    await page.locator("[data-offering-choice='tea']").click().catch(() => {});
    await page.locator("[data-incense-wish]").fill("Team vui ve, don vao deu.");
    await page.locator("[data-incense-form] button[type='submit']").click();
    await page.waitForTimeout(150);
  }
}

async function installApiMock(page, state) {
  await page.route("**/*", async route => {
    const request = route.request();
    if (!request.url().startsWith(apiUrl)) {
      await route.continue();
      return;
    }

    let payload = {};
    try {
      payload = JSON.parse(request.postData() || "{}");
    } catch {
      payload = {};
    }
    report.apiCalls.push({ action: payload.action || "", url: request.url() });
    const response = handleAction(state, payload);
    await route.fulfill({
      status: response.ok === false ? 400 : 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(response)
    });
  });
}

function handleAction(state, payload) {
  switch (payload.action) {
    case "bootstrapStatus":
      return { ok: true, hasAdmin: true };
    case "login":
      return { ok: true, token, user: state.user };
    case "me":
      return { ok: true, user: state.user };
    case "logout":
      return { ok: true };
    case "getPageData":
      return pageData(state, payload.scopes || []);
    case "listUsers":
      return { ok: true, users: state.users };
    case "createUser": {
      const user = {
        id: `qa-user-${Date.now()}`,
        name: payload.name,
        email: payload.email,
        role: payload.role || "sales",
        status: "active",
        lastLoginAt: ""
      };
      state.users.push(user);
      return { ok: true, user };
    }
    case "toggleUser": {
      const user = state.users.find(item => item.id === payload.id);
      if (!user) return { ok: false, error: "User not found" };
      user.status = user.status === "active" ? "disabled" : "active";
      return { ok: true, user };
    }
    case "deleteUser":
      state.users = state.users.filter(item => item.id !== payload.id);
      return { ok: true };
    case "listAuditLogs":
      return { ok: true, logs: state.auditLogs };
    case "createTeamItem":
      return createTeamItem(state, payload);
    case "updateTeamItem":
      return updateTeamItem(state, payload);
    case "archiveTeamItem":
      return archiveTeamItem(state, payload);
    case "getOmniWorkspaceData":
      return omniData(state);
    case "upsertSalesChannel":
      return upsertSalesChannel(state, payload);
    case "upsertChannelProduct":
      return upsertChannelProduct(state, payload);
    case "upsertWorkspaceTask":
      return upsertWorkspaceTask(state, payload);
    case "archiveWorkspaceTask":
      state.workspaceTasks = (state.workspaceTasks || []).filter(task => task.id !== payload.id);
      return { ok: true };
    case "getIncenseData":
      return incenseData(state);
    case "createIncenseWish":
      return createIncenseWish(state, payload);
    case "createOrder":
      return createOrder(state, payload);
    case "createPurchaseOrder":
      return createPurchaseOrder(state, payload);
    case "payPurchaseOrder":
      return payPurchaseOrder(state, payload);
    case "createOrderReceiptPdf":
      return createReceipt(state, payload);
    case "getAppSettings":
      return { ok: true, settings: state.appSettings || {} };
    case "updateAppSettings":
      state.appSettings = { ...(state.appSettings || {}), [payload.key]: payload.value };
      return { ok: true, settings: state.appSettings };
    case "getTeamWorkspaceData":
      return teamData(state);
    case "listProducts":
      return productsData(state);
    case "listCustomers":
      return { ok: true, customers: state.customers };
    case "listOrders":
      return { ok: true, orders: state.orders, salesReturns: state.salesReturns, orderRefunds: state.orderRefunds };
    case "listStockMovements":
      return { ok: true, movements: state.stockMovements };
    case "getAccountingData":
      return accountingData(state);
    case "createAccountingReconciliation":
      return createAccountingReconciliation(state, payload);
    case "updateCashTransaction": {
      const transaction = state.cashTransactions.find(item => item.id === payload.id);
      if (!transaction) return { ok: false, error: "Transaction not found" };
      const before = structuredClone(transaction);
      if (transaction.referenceType && transaction.referenceType !== "manual") {
        transaction.documentUrl = payload.documentUrl || "";
      } else {
        Object.assign(transaction, {
          type: payload.type || transaction.type,
          accountId: payload.accountId || transaction.accountId,
          categoryId: payload.categoryId || transaction.categoryId,
          amount: Number(payload.amount || transaction.amount),
          transactionDate: payload.transactionDate || transaction.transactionDate,
          description: payload.description || transaction.description,
          referenceId: payload.referenceId || "",
          documentUrl: payload.documentUrl || ""
        });
      }
      transaction.updatedAt = new Date().toISOString();
      state.auditLogs = [{
        id: `audit-cash-${Date.now()}`,
        action: "updateCashTransaction",
        description: "Cập nhật giao dịch thu chi",
        entityType: "cash_transaction",
        entityId: transaction.id,
        actorId: state.user.id,
        actorName: state.user.name,
        actorEmail: state.user.email,
        detail: { before, request: payload, result: { transaction: structuredClone(transaction) } },
        createdAt: new Date().toISOString(),
        timezone: "Asia/Ho_Chi_Minh"
      }, ...(state.auditLogs || [])];
      return { ok: true, transaction };
    }
    case "createPlatformPayout": {
      const payout = { id:`qa-payout-${Date.now()}`, channelId:payload.channelId, channelCode:payload.channelCode, payoutCode:payload.payoutCode, periodStart:payload.periodStart, periodEnd:payload.periodEnd, payoutDate:payload.payoutDate, accountId:payload.accountId, grossAmount:Number(payload.grossAmount||0), totalFees:Number(payload.totalFees||0), totalRefunds:Number(payload.totalRefunds||0), expectedAmount:Number(payload.expectedAmount||0), actualAmount:Number(payload.actualAmount||0), difference:Number(payload.actualAmount||0)-Number(payload.expectedAmount||0), status:payload.status||"draft", items:[], createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
      state.platformPayouts = [payout, ...(state.platformPayouts || [])]; return { ok:true, platformPayout:payout };
    }
    case "autoMatchPlatformPayout": return { ok:true, matched:1, status:"matched" };
    case "postPlatformPayout": {
      const payout = (state.platformPayouts || []).find(item=>item.id===payload.id); if (payout) payout.status="posted";
      return { ok:true, platformPayout:payout, transaction:{ id:`qa-payout-tx-${Date.now()}`,type:"income",amount:payout?.actualAmount||0,accountId:payout?.accountId||"",categoryId:"acc-cat-income",referenceType:"platform_payout",referenceId:payout?.id||"",status:"active" } };
    }
    case "updateAccountingSettings": state.accountingSettings=payload.settings||{}; return { ok:true, accountingSettings:state.accountingSettings };
    case "getPurchasingData":
      return purchasingData(state);
    default:
      return { ok: true };
  }
}

function pageData(state, scopes) {
  const requested = Array.isArray(scopes) ? scopes : [];
  return requested.reduce((payload, scope) => {
    Object.assign(payload, {
      products: ["products", "orders", "stockMovements", "purchasing", "content", "team", "omni"].includes(scope) ? state.products : payload.products,
      customers: ["customers", "orders"].includes(scope) ? state.customers : payload.customers,
      orders: ["orders", "accounting", "reports"].includes(scope) ? state.orders : payload.orders
    });
    if (scope === "products") Object.assign(payload, productsData(state));
    if (scope === "customers") payload.customers = state.customers;
    if (scope === "orders") Object.assign(payload, { orders: state.orders, salesReturns: state.salesReturns, orderRefunds: state.orderRefunds });
    if (scope === "stockMovements") payload.movements = state.stockMovements;
    if (scope === "accounting") Object.assign(payload, accountingData(state));
    if (scope === "purchasing") Object.assign(payload, purchasingData(state));
    if (scope === "content") Object.assign(payload, contentData(state));
    if (scope === "team") Object.assign(payload, teamData(state));
    if (scope === "omni") Object.assign(payload, omniData(state));
    if (scope === "incense") Object.assign(payload, incenseData(state));
    if (scope === "settings") payload.settings = state.appSettings || {};
    return payload;
  }, { ok: true });
}

function productsData(state) {
  return { ok: true, products: state.products, productOptions: state.productOptions, contentOwners: state.contentOwners };
}

function accountingData(state) {
  if (!state.platformPayouts) state.platformPayouts = [{ id:"qa-payout-001",channelId:"channel-shopee",channelCode:"shopee",payoutCode:"SPX-QA-001",periodStart:"2026-07-01",periodEnd:"2026-07-07",payoutDate:"2026-07-09",accountId:state.accountingAccounts[0]?.id||"",grossAmount:420000,totalFees:42000,totalRefunds:0,expectedAmount:378000,actualAmount:377000,difference:-1000,status:"mismatch",sourceFileName:"doi-soat-qa.xlsx",items:[{id:"qa-payout-item",orderId:state.orders[0]?.id||"",orderCode:state.orders[0]?.code||"",productTotal:420000,expectedNetAmount:378000,platformNetAmount:377000,difference:-1000,status:"mismatch"}],createdAt:"2026-07-09T10:00:00+07:00",updatedAt:"2026-07-09T10:00:00+07:00"}];
  return {
    ok: true,
    accounts: state.accountingAccounts,
    categories: state.accountingCategories,
    transactions: state.cashTransactions,
    reconciliations: state.accountingReconciliations,
    platformPayouts: state.platformPayouts || [],
    accountingSettings: state.accountingSettings || {}
  };
}

function createAccountingReconciliation(state, payload) {
  const account = state.accountingAccounts.find(item => item.id === payload.accountId) || state.accountingAccounts[0];
  const systemBalance = Number(account?.currentBalance || 0);
  const actualBalance = Number(payload.actualBalance || 0);
  const difference = actualBalance - systemBalance;
  const reconciliation = {
    id: `qa-reconciliation-${Date.now()}`,
    accountId: account.id,
    systemBalance,
    actualBalance,
    difference,
    note: payload.note || "",
    reconciledBy: state.user.id,
    reconciledAt: payload.reconciledAt || "2026-06-29",
    createdAt: "2026-06-29T10:30:00+07:00"
  };
  let transaction = null;
  if (payload.adjustBalance && difference !== 0) {
    transaction = {
      id: `qa-adjustment-${Date.now()}`,
      type: difference > 0 ? "income" : "expense",
      accountId: account.id,
      categoryId: state.accountingCategories[0]?.id || "qa-category",
      amount: Math.abs(difference),
      transactionDate: reconciliation.reconciledAt,
      description: "Äiá»u chá»‰nh Ä‘á»‘i soÃ¡t",
      referenceType: "reconciliation",
      referenceId: reconciliation.id,
      createdBy: state.user.id,
      status: "active",
      createdAt: reconciliation.createdAt,
      updatedAt: reconciliation.createdAt
    };
    state.cashTransactions.unshift(transaction);
    account.currentBalance = actualBalance;
  }
  state.accountingReconciliations.unshift(reconciliation);
  return { ok: true, reconciliation, transaction };
}

function purchasingData(state) {
  return {
    ok: true,
    suppliers: state.suppliers,
    purchaseOrders: state.purchaseOrders,
    supplierPayments: state.supplierPayments,
    purchaseReturns: state.purchaseReturns,
    supplierCreditApplications: state.supplierCreditApplications
  };
}

function contentData(state) {
  return {
    ok: true,
    contentItems: state.contentItems,
    products: state.products,
    contentOwners: state.contentOwners
  };
}

function teamData(state) {
  return {
    ok: true,
    teamMeetings: state.teamMeetings,
    teamPlans: state.teamPlans,
    teamPricingModels: state.teamPricingModels,
    teamDecisions: state.teamDecisions,
    workspaceTasks: state.workspaceTasks || [],
    campaigns: state.campaigns || [],
    products: state.products,
    contentOwners: state.contentOwners,
    users: state.users
  };
}

function omniData(state) {
  return {
    ok: true,
    salesChannels: state.salesChannels || [],
    channelProducts: state.channelProducts || [],
    inventoryReservations: state.inventoryReservations || [],
    campaigns: state.campaigns || [],
    workspaceTasks: state.workspaceTasks || [],
    products: state.products,
    orders: state.orders,
    users: state.users,
    tiktokConnection: {
      configured: true,
      connected: true,
      id: "qa-tiktok-connection",
      salesChannelId: "channel-tiktok",
      shopId: "qa-shop",
      shopName: "ArtFlow TikTok Shop",
      region: "VN",
      status: "active",
      scopes: ["seller.authorization.info", "seller.product.basic", "seller.product.write"],
      mappedSkuCount: 1,
      unmatchedSkuCount: 2,
      lastProductSyncAt: "2026-08-15T09:00:00.000Z",
      lastInventorySyncAt: "2026-08-15T09:05:00.000Z"
    }
  };
}

function upsertSalesChannel(state, payload) {
  const item = {
    id: payload.id || `qa-channel-${Date.now()}`,
    code: payload.code || "qa",
    name: payload.name || "QA Channel",
    type: payload.type || "marketplace",
    status: payload.status || "active",
    syncMode: payload.syncMode || "manual",
    defaultPricePolicy: payload.defaultPricePolicy || "same",
    note: payload.note || "",
    createdAt: "2026-06-29T10:30:00+07:00",
    updatedAt: "2026-06-29T10:30:00+07:00"
  };
  state.salesChannels = [item, ...(state.salesChannels || []).filter(channel => channel.id !== item.id)];
  return { ok: true, salesChannel: item };
}

function upsertChannelProduct(state, payload) {
  const product = state.products.find(item => item.id === payload.productId) || state.products[0];
  const channel = (state.salesChannels || [])[0] || { id: "channel-pos" };
  const item = {
    id: payload.id || (state.channelProducts || []).find(row => row.productId === payload.productId && row.channelId === payload.channelId)?.id || `qa-channel-product-${Date.now()}`,
    channelId: payload.channelId || channel.id,
    productId: payload.productId || product.id,
    channelSku: payload.channelSku || product.sku,
    channelName: payload.channelName || product.name,
    channelPrice: Number(payload.channelPrice || product.salePrice || 0),
    channelStock: Number(payload.channelStock || product.stock || 0),
    syncStock: payload.syncStock !== false,
    syncPrice: payload.syncPrice === true,
    status: "active",
    lastSyncAt: "2026-06-29T10:30:00+07:00",
    note: payload.note || "",
    createdAt: "2026-06-29T10:30:00+07:00",
    updatedAt: "2026-06-29T10:30:00+07:00"
  };
  state.channelProducts = [item, ...(state.channelProducts || []).filter(row => row.id !== item.id && !(row.productId === item.productId && row.channelId === item.channelId))];
  return { ok: true, channelProduct: item };
}

function upsertWorkspaceTask(state, payload) {
  const item = {
    id: payload.id || `qa-task-${Date.now()}`,
    title: payload.title || "QA task",
    status: payload.status || "todo",
    priority: payload.priority || "normal",
    owner: payload.owner || state.user.id,
    sourceType: payload.sourceType || "manual",
    sourceId: payload.sourceId || "",
    productId: payload.productId || "",
    channelId: payload.channelId || "",
    campaignId: payload.campaignId || "",
    dueDate: payload.dueDate || "2026-07-10",
    description: payload.description || "",
    createdBy: state.user.id,
    createdAt: "2026-06-29T10:30:00+07:00",
    updatedAt: "2026-06-29T10:30:00+07:00"
  };
  state.workspaceTasks = [item, ...(state.workspaceTasks || []).filter(task => task.id !== item.id)];
  return { ok: true, workspaceTask: item };
}

function incenseData(state) {
  return {
    ok: true,
    incenseWishes: state.incenseWishes || []
  };
}

function createIncenseWish(state, payload) {
  const item = {
    id: `qa-wish-${Date.now()}`,
    kind: payload.kind || "sales",
    wish: payload.wish || "Xin mot ngay nhe dau.",
    offerings: Array.isArray(payload.offerings) ? payload.offerings : ["banana"],
    actorId: state.user.id,
    actorName: state.user.name,
    actorEmail: state.user.email,
    createdAt: "2026-06-29T10:30:00+07:00"
  };
  state.incenseWishes = [item, ...(state.incenseWishes || [])].slice(0, 30);
  return { ok: true, incenseWish: item, incenseWishes: state.incenseWishes };
}

function createTeamItem(state, payload) {
  const detail = parseDetail(payload);
  const collection = teamCollection(state, payload.itemType);
  const item = {
    ...detail,
    id: `qa-${payload.itemType}-${Date.now()}`,
    status: detail.status || "draft",
    createdAt: "2026-06-29T10:00:00+07:00",
    updatedAt: "2026-06-29T10:00:00+07:00"
  };
  collection.push(item);
  return { ok: true, teamItem: item };
}

function updateTeamItem(state, payload) {
  const detail = parseDetail(payload);
  const collection = teamCollection(state, payload.itemType);
  const index = collection.findIndex(item => item.id === payload.id);
  if (index === -1) return { ok: false, error: "Not found" };
  collection[index] = { ...collection[index], ...detail, updatedAt: "2026-06-29T10:00:00+07:00" };
  return { ok: true, teamItem: collection[index] };
}

function archiveTeamItem(state, payload) {
  const collection = teamCollection(state, payload.itemType);
  const index = collection.findIndex(item => item.id === payload.id);
  if (index !== -1) collection.splice(index, 1);
  return { ok: true };
}

function teamCollection(state, type) {
  return {
    meeting: state.teamMeetings,
    plan: state.teamPlans,
    pricing: state.teamPricingModels,
    decision: state.teamDecisions
  }[type] || state.teamMeetings;
}

function parseDetail(payload) {
  try {
    return JSON.parse(payload.itemJson || "{}");
  } catch {
    return {};
  }
}

function createOrder(state, payload) {
  const items = (payload.items || []).map((entry, index) => {
    const product = state.products.find(item => item.id === entry.productId);
    if (!product) throw new Error("Product not found");
    const quantity = Number(entry.quantity || 1);
    const unitPrice = Number(entry.unitPrice || product.salePrice);
    if (!unitPrice || unitPrice <= 0) throw new Error(`Sản phẩm ${product.name} chưa có giá bán hợp lệ.`);
    product.stock = Math.max(0, product.stock - quantity);
    return {
      id: `qa-order-item-${index + 1}`,
      orderId: "qa-order",
      productId: product.id,
      sku: product.sku,
      name: product.name,
      quantity,
      unitPrice,
      costPrice: product.costPrice,
      lineTotal: unitPrice * quantity,
      createdAt: "2026-06-29T10:05:00+07:00"
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const order = {
    id: `qa-order-${state.orders.length + 1}`,
    code: `POS-20260629-${String(state.orders.length + 1).padStart(4, "0")}`,
    customerId: payload.customerId,
    status: payload.status || "completed",
    paymentStatus: payload.paymentStatus || "paid",
    paymentMethod: payload.paymentMethod || "cash",
    subtotal,
    discount: Number(payload.discount || 0) + Number(payload.loyaltyDiscount || 0),
    shippingFee: Number(payload.shippingFee || 0),
    total: Math.max(0, subtotal - Number(payload.discount || 0) - Number(payload.loyaltyDiscount || 0) + Number(payload.shippingFee || 0)),
    returnedAmount: 0,
    refundedAmount: 0,
    note: payload.note || "",
    createdBy: state.user.id,
    createdAt: "2026-06-29T10:05:00+07:00",
    updatedAt: "2026-06-29T10:05:00+07:00",
    channel: payload.channel || "pos",
    shippingStatus: payload.shippingStatus || "none",
    carrier: payload.carrier || "",
    trackingCode: payload.trackingCode || "",
    items
  };
  state.orders.unshift(order);
  return { ok: true, order };
}

function createReceipt(state, payload) {
  const order = state.orders.find(item => item.id === payload.id || item.code === payload.code) || state.orders[0];
  const saved = {
    ...order,
    receiptPdfUrl: `https://drive.google.com/file/d/qa-${order.id}/view`,
    receiptPdfId: `qa-${order.id}`
  };
  const index = state.orders.findIndex(item => item.id === saved.id);
  if (index !== -1) state.orders[index] = saved;
  return { ok: true, order: saved };
}

function createPurchaseOrder(state, payload) {
  const supplier = state.suppliers.find(item => item.id === payload.supplierId) || state.suppliers[0];
  const items = (payload.items || []).map((item, index) => {
    const product = state.products.find(row => row.id === item.productId) || state.products[0];
    const quantity = Number(item.quantity || 1);
    const unitCost = Number(item.unitCost || product.costPrice || 0);
    return {
      id: `qa-po-item-${Date.now()}-${index}`,
      purchaseOrderId: "",
      productId: product.id,
      sku: product.sku,
      name: product.name,
      quantity,
      unitCost,
      lineTotal: quantity * unitCost,
      createdAt: "2026-06-29T10:30:00+07:00"
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const discount = Number(payload.discount || 0);
  const shippingFee = Number(payload.shippingFee || 0);
  const id = `qa-po-${Date.now()}`;
  const order = {
    id,
    code: `PO-QA-${state.purchaseOrders.length + 1}`,
    supplierId: supplier.id,
    status: "draft",
    paymentStatus: "unpaid",
    subtotal,
    discount,
    shippingFee,
    total: Math.max(0, subtotal - discount + shippingFee),
    paidAmount: 0,
    creditAppliedAmount: 0,
    settledAmount: 0,
    returnedAmount: 0,
    netTotal: Math.max(0, subtotal - discount + shippingFee),
    outstanding: Math.max(0, subtotal - discount + shippingFee),
    creditAmount: 0,
    dueDate: payload.dueDate || "",
    invoiceNumber: payload.invoiceNumber || "",
    note: payload.note || "",
    createdBy: state.user.id,
    receivedAt: "",
    createdAt: "2026-06-29T10:30:00+07:00",
    updatedAt: "2026-06-29T10:30:00+07:00",
    items: items.map(item => ({ ...item, purchaseOrderId: id }))
  };
  state.purchaseOrders = [order, ...(state.purchaseOrders || [])];
  return { ok: true, purchaseOrder: order };
}

function payPurchaseOrder(state, payload) {
  const order = state.purchaseOrders.find(item => item.id === payload.id);
  if (!order || order.status !== "received" || order.paymentStatus === "paid" || order.outstanding <= 0) return { ok:false, error:"Purchase order is not payable" };
  const amount = Number(payload.amount);
  const account = state.accountingAccounts.find(item => item.id === payload.accountId && item.status === "active");
  const category = state.accountingCategories.find(item => item.id === payload.categoryId && item.status === "active" && item.type === "expense");
  if (!Number.isFinite(amount) || amount <= 0 || amount > order.outstanding) return { ok:false, error:"Payment amount is invalid" };
  if (!account || !category) return { ok:false, error:"Payment account or expense category is invalid" };
  const supplier = state.suppliers.find(item => item.id === order.supplierId);
  const now = new Date().toISOString();
  const transaction = { id:`qa-supplier-tx-${Date.now()}`,type:"expense",accountId:account.id,categoryId:category.id,amount,transactionDate:payload.paymentDate||"2026-07-12",description:payload.note||`Thanh toán phiếu mua ${order.code}`,referenceType:"purchase_order",referenceId:order.id,channelId:"",documentUrl:"",createdBy:state.user.id,status:"active",createdAt:now,updatedAt:now };
  const payment = { id:`qa-supplier-payment-${Date.now()}`,purchaseOrderId:order.id,supplierId:supplier.id,cashTransactionId:transaction.id,amount,paymentDate:transaction.transactionDate,note:payload.note||"",createdBy:state.user.id,createdAt:now };
  order.paidAmount += amount;
  order.settledAmount = order.paidAmount + order.creditAppliedAmount;
  order.outstanding = Math.max(0, order.netTotal - order.settledAmount);
  order.paymentStatus = order.outstanding <= 0 ? "paid" : "partial";
  supplier.outstanding = Math.max(0, supplier.outstanding - amount);
  account.currentBalance -= amount;
  state.cashTransactions.unshift(transaction);
  state.supplierPayments.unshift(payment);
  return { ok:true,purchaseOrder:order,supplier,payment,transaction };
}
