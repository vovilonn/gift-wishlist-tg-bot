import { describe, expect, it } from "vitest";

import { buildSignedInitDataForTest, verifyTelegramInitData } from "./telegram-init-data";

const botToken = "123456:ABCDEF";

describe("verifyTelegramInitData", () => {
  it("verifies valid payload", () => {
    const initData = buildSignedInitDataForTest(
      {
        auth_date: String(Math.floor(Date.now() / 1000)),
        query_id: "AAEAAAE",
        user: JSON.stringify({
          id: 123456,
          first_name: "Test",
          username: "tester"
        })
      },
      botToken
    );

    const result = verifyTelegramInitData(initData, botToken, 60 * 60 * 24);
    expect(result.user.id).toBe(123456);
    expect(result.queryId).toBe("AAEAAAE");
  });

  it("throws when signature is invalid", () => {
    const valid = buildSignedInitDataForTest(
      {
        auth_date: String(Math.floor(Date.now() / 1000)),
        user: JSON.stringify({ id: 1 })
      },
      botToken
    );
    const brokenParams = new URLSearchParams(valid);
    brokenParams.set("hash", "deadbeef");
    const broken = brokenParams.toString();

    expect(() => verifyTelegramInitData(broken, botToken, 60 * 60 * 24)).toThrow();
  });

  it("throws on expired auth_date", () => {
    const initData = buildSignedInitDataForTest(
      {
        auth_date: String(Math.floor(Date.now() / 1000) - 200),
        user: JSON.stringify({ id: 1 })
      },
      botToken
    );
    expect(() => verifyTelegramInitData(initData, botToken, 10)).toThrow();
  });
});
