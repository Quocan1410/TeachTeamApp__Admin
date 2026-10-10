import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { admin } from "./helpers";

const userEmail = "e2e.admin@candidate.edu.au";
const courseCode = "E2E9999";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("textbox", { name: "Username (admin)" }).fill(admin.email);
  await page.getByRole("textbox", { name: "Password" }).fill(admin.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Total Users")).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test.describe("admin create, edit, block, and delete", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("user management can create, block, unblock, and delete a person", async ({ page }) => {
    test.setTimeout(90_000);
    execFileSync(process.execPath, ["ci/delete-admin-user.mjs", userEmail], {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
    });
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Users" }).click();
    const searched = page.waitForResponse(
      (response) =>
        response.url().includes("graphql") &&
        (response.request().postData() ?? "").includes(userEmail)
    );
    await page.getByRole("textbox", { name: "Search users..." }).fill(userEmail);
    await searched;
    const row = page.locator("tr").filter({ hasText: userEmail });
    if ((await row.count()) > 0) {
      await row.getByTitle("Delete user").click();
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await expect(row).toHaveCount(0);
    }

    await page.getByRole("button", { name: "Create user" }).click();
    await page.getByRole("button", { name: "Title" }).click();
    await page.getByRole("option", { name: "Ms." }).click();
    await page.getByRole("textbox", { name: "Email" }).fill(userEmail);
    await page.getByRole("textbox", { name: "Password Show password", exact: true }).fill("Password123!");
    await page.getByRole("textbox", { name: "Confirm password Show password" }).fill("Password123!");
    await page.getByRole("textbox", { name: "First name" }).fill("Eden");
    await page.getByRole("textbox", { name: "Last name" }).fill("Coverage");
    const created = page.waitForResponse(
      (response) => {
        const body = response.request().postData() ?? "";
        return response.url().includes("graphql") && body.includes("mutation CreateUser");
      },
      { timeout: 15_000 }
    );
    await page.locator("form").getByRole("button", { name: "Create user" }).click();
    const createdResponse = await created;
    const createdBody = (await createdResponse.text()).replace(/Password123!/g, "[redacted]");
    expect(createdResponse.ok(), createdBody).toBeTruthy();
    expect(createdBody, createdBody).toContain('"success":true');
    await expect(page.getByRole("heading", { name: "Create User" })).toBeHidden();
    const createdRow = page.locator("tr").filter({ hasText: userEmail });
    await expect(createdRow).toBeVisible();

    await createdRow.getByTitle("Block user").click();
    await expect(createdRow.getByText("Blocked")).toBeVisible();
    await createdRow.getByTitle("Unblock user").click();
    await expect(createdRow.getByText("Active")).toBeVisible();

    await createdRow.getByTitle("Delete user").click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(createdRow).toHaveCount(0);
  });

  test("course management can create, edit, and delete a course", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/dashboard/courses");
    const searched = page.waitForResponse(
      (response) =>
        response.url().includes("graphql") &&
        (response.request().postData() ?? "").includes(courseCode)
    );
    await page.getByRole("textbox", { name: "Search courses..." }).fill(courseCode);
    await searched;
    const card = page.locator("[class*='courseCard']").filter({ hasText: courseCode });
    if ((await card.count()) > 0) {
      await card.getByTitle("Delete Course").click();
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await expect(card).toHaveCount(0);
    }

    await page.getByRole("button", { name: "Add Course" }).click();
    await page.getByPlaceholder("e.g., COSC2758").fill(courseCode);
    await page.getByPlaceholder("e.g., Introduction to Computer Science").fill("E2E Course Original");
    await page.getByPlaceholder("e.g., Semester 2 2025").fill("Semester 2 2026");
    await page.getByRole("button", { name: "Create Course" }).click();
    await expect(card.getByRole("heading", { name: "E2E Course Original" })).toBeVisible();

    await card.getByTitle("Edit Course").click();
    await page.getByPlaceholder("Course name").fill("E2E Course Updated");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(card.getByRole("heading", { name: "E2E Course Updated" })).toBeVisible();

    await card.getByTitle("Delete Course").click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(card).toHaveCount(0);
  });

  test("user list pagination opens the next page", async ({ page }) => {
    test.setTimeout(90_000);
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Users" }).click();
    await expect(page.getByText(/Page 1 of/)).toBeVisible();
    const nextPage = page.getByRole("button", { name: "Next", exact: true });
    await expect(nextPage).toBeEnabled();
    await nextPage.click({ force: true });
    await expect(page.getByText(/Page 2 of/)).toBeVisible();
    await page.getByRole("button", { name: "Previous" }).click({ force: true });
    await expect(page.getByText(/Page 1 of/)).toBeVisible();
  });
});
