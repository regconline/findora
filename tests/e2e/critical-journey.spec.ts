import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Critical journey (spec §26): customer registers & logs in, business owner registers,
 * creates a business, admin approves it, it appears publicly, a customer finds it,
 * sends an enquiry, the owner sees it and the customer sees their history.
 *
 * Requirements (test project only — never production):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (used to confirm emails and promote the admin)
 *   E2E_BASE_URL
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });
const run = Date.now().toString(36);
const pw = "E2e-password-2026";
const customer = { name: "Thandi Customer", email: `customer+${run}@example.com` };
const owner = { name: "Sipho Owner", email: `owner+${run}@example.com` };
const adminUser = { name: "Ada Admin", email: `admin+${run}@example.com` };
const bizName = `E2E Plumbing ${run}`;

test.describe.configure({ mode: "serial" });
test.beforeEach(({}, info) => { test.skip(info.project.name !== "desktop", "journey runs once on desktop"); });

async function confirm(email: string) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const u = data.users.find((x) => x.email === email)!;
  await admin.auth.admin.updateUserById(u.id, { email_confirm: true });
  return u.id;
}
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(pw);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/dashboard|admin/);
}
async function register(page: Page, path: string, u: { name: string; email: string }) {
  await page.goto(path);
  await page.getByLabel("Full name").fill(u.name);
  await page.getByLabel("Email address").fill(u.email);
  await page.getByLabel("Phone number").fill("0821234567");
  await page.getByLabel("Password", { exact: true }).fill(pw);
  await page.getByLabel("Confirm password").fill(pw);
  await page.getByText("I accept the").click();
  await page.getByRole("button", { name: /Create account/ }).click();
  await page.waitForURL(/verify-email|dashboard/);
}

test("1-2. customer registers and logs in", async ({ page }) => {
  await register(page, "/register?type=customer", customer);
  await confirm(customer.email);
  await login(page, customer.email);
  await expect(page.getByRole("heading", { name: /Hello/ })).toBeVisible();
});

test("3-4. business owner registers and creates a business", async ({ page }) => {
  await register(page, "/register/business", owner);
  await confirm(owner.email);
  await login(page, owner.email);
  await page.goto("/dashboard/businesses/new");
  await page.getByLabel("Business name").fill(bizName);
  await page.getByLabel("Business description").fill("Residential plumbing, geyser installations and leak detection for homes in Klerksdorp and surrounds.");
  await page.getByLabel("Business category").selectOption({ label: "Construction and Contractors" });
  await page.getByRole("button", { name: /Create listing/ }).click();
  await page.waitForURL(/setup\/location/);
  await page.getByLabel("Province").selectOption("North West");
  await page.getByLabel("City").fill("Klerksdorp");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.waitForURL(/setup\/contact/);
  await page.getByLabel("Business telephone").fill("0181234567");
  await page.getByText("I confirm that I am authorised").click();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.waitForURL(/setup\/branding/);
  await page.goto(page.url().replace("branding", "services"));
  await page.getByLabel("Service name").last().fill("Geyser installation");
  await page.getByLabel("Price type").last().selectOption("starting_from");
  await page.getByLabel("Price (R)").last().fill("4500");
  await page.getByRole("button", { name: "Add service" }).click();
  await expect(page.getByText("Service added.")).toBeVisible();
  await page.goto(page.url().replace("services", "submit"));
  await page.getByRole("button", { name: "Submit for publication" }).click();
  await page.waitForURL(/submitted=1/);
});

test("5. administrator approves it", async ({ page }) => {
  await register(page, "/register?type=customer", adminUser);
  const id = await confirm(adminUser.email);
  await admin.from("profiles").update({ role: "admin" }).eq("id", id);
  await login(page, adminUser.email);
  await page.goto("/admin/businesses?status=pending");
  await page.getByRole("link", { name: bizName }).click();
  await page.getByRole("button", { name: "Approve and publish" }).click();
  await expect(page.getByText("Listing approved.")).toBeVisible();
});

test("6-9. business appears publicly, customer searches and sends an enquiry", async ({ page }) => {
  await login(page, customer.email);
  await page.goto(`/businesses?q=${encodeURIComponent(bizName)}`);
  await page.getByRole("link", { name: bizName }).click();
  await expect(page.getByRole("heading", { level: 1, name: bizName })).toBeVisible();
  await page.getByLabel("Subject").fill("Geyser quote");
  await page.getByLabel("Message").fill("Please quote for a new 150L geyser installation.");
  await page.getByText("I agree that Findora may share").click();
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.getByText(/Your enquiry has been sent/)).toBeVisible();
});

test("10. business owner receives the enquiry", async ({ page }) => {
  await login(page, owner.email);
  await page.goto("/dashboard/enquiries");
  await expect(page.getByText("Geyser quote")).toBeVisible();
});

test("11. customer sees enquiry history; cross-account access is denied", async ({ page }) => {
  await login(page, customer.email);
  await page.goto("/dashboard/my-enquiries");
  await expect(page.getByText("Geyser quote")).toBeVisible();
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(404);
});
