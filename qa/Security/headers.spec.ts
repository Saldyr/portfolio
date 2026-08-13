import { test } from "playwright/test";

// Pas de headers() dans next.config.ts aujourd'hui (QA_PLAN.md section 1).
test.fixme("headers: Content-Security-Policy présent", async () => {});
test.fixme("headers: X-Frame-Options présent", async () => {});
test.fixme("headers: Referrer-Policy présent", async () => {});
