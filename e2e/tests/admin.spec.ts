import { expect, test } from "@playwright/test";
import { admin } from "./helpers";

test.describe("admin", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("textbox", { name: "Username (admin)" }).fill(admin.email);
    await page.getByRole("textbox", { name: "Password" }).fill(admin.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Total Users")).toBeVisible();
  });

  test("dashboard shows user and course totals", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
    await expect(page.getByText("Candidates")).toBeVisible();
    await expect(page.getByText("Lecturers")).toBeVisible();
    await expect(page.getByText("Courses Overview")).toBeVisible();
  });

  test("user search matches a full name", async ({ page }) => {
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Users" }).click();
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
    await page.getByRole("textbox", { name: "Search users..." }).fill("Alex Nguyen");
    await expect(page.getByText("Showing 1–1 of 1")).toBeVisible();
    await expect(page.getByText("alex.candidate@candidate.edu.au")).toBeVisible();
  });

  test("course search matches a course name", async ({ page }) => {
    await page.goto("/dashboard/courses");
    await expect(page.getByRole("heading", { name: "Course Management" })).toBeVisible();
    await expect(page.getByText(/Showing 1/)).toBeVisible();
    await page.getByRole("textbox", { name: "Search courses..." }).fill("Accounting");
    await expect(page.getByRole("heading", { name: "Financial Accounting" })).toBeVisible();
    await expect(page.getByText("ACCT5001")).toBeVisible();
  });

  test("selections page lists selected candidates", async ({ page }) => {
    await page.goto("/dashboard/reports");
    await expect(page.getByRole("heading", { name: "Selection Overview" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Selected by Course" })).toBeVisible();
    await expect(page.getByText(/Showing 1/)).toBeVisible();
  });
});
