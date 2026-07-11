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
  ["dashboard", "pages/dashboard.html"],
  ["orders", "pages/orders.html"],
  ["order-create", "pages/order-create.html"],
  ["products", "pages/products.html"],
  ["channels", "pages/channels.html"],
  ["content", "pages/content.html"],
  ["team", "pages/team.html"],
  ["team-pricing", "pages/team-pricing.html"],
  ["meeting-minutes", "pages/meeting-minutes.html"],
  ["incense", "pages/incense.html"],
  ["customers", "pages/customers.html"],
  ["inventory", "pages/inventory.html"],
  ["accounting", "pages/accounting.html"],
  ["purchasing", "pages/purchasing.html"],
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
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", message => {
      if (["error", "warning"].includes(message.type())) {
        consoleErrors.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", error => pageErrors.push(error.message));
    await installApiMock(page, state);

    const url = pathToFileURL(path.join(root, relativeFile)).href;
    const started = Date.now();
    let result;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("[data-app-shell]:not([hidden])", { timeout: 8000 });
      await page.waitForTimeout(250);
      await runPageInteractions(page, name, viewport.name);
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
  if (pageName === "team") {
    await page.locator("[data-team-view='tasks']").click().catch(() => {});
    await page.locator("[data-team-secondary-action]").click().catch(() => {});
    await page.locator("#taskTitle").fill("QA kiem tra workflow task").catch(() => {});
    await page.locator("[data-modal-form] button[type='submit']").click().catch(() => {});
    await page.locator("[data-modal-backdrop][hidden], .modal-backdrop[hidden]").waitFor({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(100);
  }
  if (pageName === "meeting-minutes") {
    await page.locator("#minutesTitle").fill("QA bien ban hop nhanh");
    await page.locator("[data-minutes-template='planning']").click().catch(() => {});
    await page.locator("[data-minutes-quick-note]").fill("Chot: mo shop TikTok trong tuan nay\nViec: Ngoc Hoa chuan bi logo truoc 2026-07-12\nhttps://drive.google.com/demo");
    await page.locator("[data-minutes-parse-quick]").click().catch(() => {});
    await page.locator("[data-meeting-minutes-form] button[type='submit']").click().catch(() => {});
    await page.waitForTimeout(100);
  }
  if (pageName === "channels") {
    await page.locator("[data-open-channel-product-form]").first().click().catch(() => {});
    await page.waitForTimeout(80);
    await page.locator("#channelSku").fill("QA-SKU-001").catch(() => {});
    await page.locator("[data-modal-form] button[type='submit']").click().catch(() => {});
    await page.locator("[data-modal-backdrop][hidden], .modal-backdrop[hidden]").waitFor({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(120);
  }
  if (pageName === "order-create") {
    await page.locator("[data-open-product-picker], [data-show-product-picker], [data-product-picker-open]").first().click({ timeout: 1200 }).catch(() => {});
    await page.waitForTimeout(100);
  }
  if (pageName === "purchase-create") {
    await page.locator("[data-add-product-to-purchase]").first().click();
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
    for (const view of ["overview", "payouts", "ledger", "receivables", "expenses", "profit", "tax", "settings"]) {
      await page.locator(`[data-accounting-view-filter='${view}']`).click();
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
      const exportButton = page.locator(`[data-accounting-section='${view}'] [data-open-accounting-export]:visible`).first();
      if (await exportButton.count()) {
        await exportButton.click().catch(() => {});
        await page.waitForTimeout(50);
        if (keepScreenshots && view === "profit") {
          await page.screenshot({ path: path.join(dir, "accounting-profit-export.png"), fullPage: false });
        }
        await page.locator("[data-close-modal]").first().click().catch(() => {});
        await page.waitForTimeout(220);
      }
      if (keepScreenshots) {
        await page.screenshot({ path: path.join(dir, `accounting-${view}.png`), fullPage: false });
      }
    }
    await page.locator("[data-accounting-view-filter='profit']").click();
    await page.locator("[data-open-accounting-profit-details]").click();
    await page.waitForTimeout(50);
    if (keepScreenshots) {
      await page.screenshot({ path: path.join(dir, "accounting-profit-details.png"), fullPage: false });
    }
    await page.locator("[data-close-modal]").first().click().catch(() => {});
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
    case "getIncenseData":
      return incenseData(state);
    case "createIncenseWish":
      return createIncenseWish(state, payload);
    case "createOrder":
      return createOrder(state, payload);
    case "createPurchaseOrder":
      return createPurchaseOrder(state, payload);
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
    users: state.users
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
