import { describe, it, expect } from "vitest";

describe("API Integrations", () => {
  it("should have Meta API credentials configured", () => {
    const metaAppId = process.env.META_APP_ID;
    const metaAppSecret = process.env.META_APP_SECRET;

    expect(metaAppId).toBeDefined();
    expect(metaAppSecret).toBeDefined();
    expect(metaAppId).toBe("6c5421fc9134212b96096e5a4b6f5eb8");
    expect(metaAppSecret).toBe("534af70c174b3c8f1c867f741098533a");
  });

  it("should have Google API credentials configured", () => {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const googleApiKey = process.env.GOOGLE_API_KEY;

    expect(googleClientId).toBeDefined();
    expect(googleClientSecret).toBeDefined();
    expect(googleApiKey).toBeDefined();
    expect(googleClientId).toBe("141533490282-5vvg10c044qqtpbclh1l7ej7u02f4urm.apps.googleusercontent.com");
    expect(googleClientSecret).toBe("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");
    expect(googleApiKey).toBe("-ENtyxwHVbD-iWslE05clQ");
  });

  it("should have Groq API key configured", () => {
    const groqApiKey = process.env.GROQ_API_KEY;

    expect(groqApiKey).toBeDefined();
    expect(groqApiKey?.length).toBeGreaterThan(0);
  });

  it("should validate Meta credentials format", () => {
    const metaAppId = process.env.META_APP_ID;
    const metaAppSecret = process.env.META_APP_SECRET;

    // Meta App ID should be a 32-character hex string
    expect(metaAppId).toMatch(/^[a-f0-9]{32}$/);
    // Meta App Secret should be a 32-character hex string
    expect(metaAppSecret).toMatch(/^[a-f0-9]{32}$/);
  });

  it("should validate Google credentials format", () => {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    // Google Client ID should contain numbers and dots
    expect(googleClientId).toMatch(/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/);
    // Google Client Secret should start with GOCSPX
    expect(googleClientSecret).toMatch(/^GOCSPX-[A-Za-z0-9_-]+$/);
  });
});
