import { expect, test, type Page } from "@playwright/test";

const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
const hasTestUser = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);

async function signIn(page: Page) {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("landing page renders the shared weekly verse", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "WFICM" })).toBeVisible();
  await expect(page.getByText("Verse of the Week")).toBeVisible();
});

test("sign-in and sign-up pages render their forms", async ({ page }) => {
  await page.goto("/signin");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.getByText("Verse of the Week")).toBeVisible();

  await page.goto("/signup");
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await expect(page.getByText("Verse of the Week")).toBeVisible();
});

test("protected dashboard redirects unauthenticated users when Supabase is configured", async ({
  page,
}) => {
  test.skip(!hasSupabase, "Requires local Supabase environment variables.");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/signin/);
});

test.describe("authenticated application smoke tests", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTestUser,
      "Set E2E_EMAIL and E2E_PASSWORD to run authenticated browser tests.",
    );
    await signIn(page);
  });

  test("create song form supports an optional artist", async ({ page }) => {
    await page.goto("/songs/new");
    await page.getByLabel("Song Title").fill("E2E Song");
    await page.getByLabel("Artist (optional)").fill("E2E Artist");
    await page.getByLabel("Lyrics").fill("Verse\nE2E lyric");
    await expect(
      page.getByRole("button", { name: "Analyze Lyrics" }),
    ).toBeVisible();
  });

  test("mobile navigation drawer traps focus and closes with Escape", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Open menu" }).click();
    const drawer = page.getByRole("dialog", { name: "Mobile navigation" });
    await expect(drawer).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Close menu" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  });

  test("guided tour opens and keeps its dialog inside the viewport", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.evaluate(() => localStorage.removeItem("wficm-tour-state"));
    await page.reload();
    const welcome = page
      .getByRole("dialog")
      .filter({ hasText: "Welcome to WFICM" });
    if (await welcome.isVisible()) {
      await welcome.getByRole("button", { name: "Start Tour" }).click();
    } else {
      await page.getByRole("button", { name: "Take a Tour" }).click();
    }
    const tourDialog = page.getByRole("dialog").last();
    await expect(tourDialog).toBeVisible();
    const box = await tourDialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(
      await page.evaluate(() => innerWidth),
    );
    expect(box!.y + box!.height).toBeLessThanOrEqual(
      await page.evaluate(() => innerHeight),
    );
  });

  test("song editor renders when a test song is provided", async ({ page }) => {
    test.skip(
      !process.env.E2E_SONG_ID,
      "Set E2E_SONG_ID for editor browser coverage.",
    );
    await page.goto(`/songs/${process.env.E2E_SONG_ID}`);
    await expect(page.getByLabel("Song title")).toBeVisible();
    await expect(page.getByText("Presentation Settings")).toBeVisible();
  });

  test("IndexedDB media upload is available in the song editor", async ({
    page,
  }) => {
    test.skip(
      !process.env.E2E_SONG_ID,
      "Set E2E_SONG_ID for browser media coverage.",
    );
    await page.goto(`/songs/${process.env.E2E_SONG_ID}`);
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles({
      name: "e2e-background.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="black"/></svg>',
      ),
    });
    await expect(page.getByText("Image applied")).toBeVisible();
    const databases = await page.evaluate(async () =>
      "databases" in indexedDB ? indexedDB.databases() : [],
    );
    expect(
      databases.some((database) => database.name === "wficm-local-media"),
    ).toBeTruthy();
  });

  test("presentation mode opens a popup when a test set is provided", async ({
    page,
    context,
  }) => {
    test.skip(
      !process.env.E2E_WORSHIP_SET_ID,
      "Set E2E_WORSHIP_SET_ID for Presentation Mode browser coverage.",
    );
    const popupPromise = context.waitForEvent("page");
    await page.goto(
      `/worship-sets/${process.env.E2E_WORSHIP_SET_ID}?present=1`,
    );
    const popup = await popupPromise;
    await expect(popup).toHaveTitle("WFICM Presentation");
    await popup.close();
  });
});
