import {
  normalizeDomain,
  normalizeOrigin,
  parseCreateWebsiteIntegrationRequest
} from "./website-integration.validation.js";

describe("website integration validation", () => {
  it("normalizes domains to a canonical hostname", () => {
    expect(normalizeDomain("  WWW.PeluqueriaJuan.com. ")).toBe(
      "peluqueriajuan.com"
    );
  });

  it("builds an HTTPS origin from a normalized domain", () => {
    expect(normalizeOrigin("peluqueriajuan.com")).toBe(
      "https://peluqueriajuan.com"
    );
  });

  it("accepts a hostname without protocol or path", () => {
    expect(
      parseCreateWebsiteIntegrationRequest({
        domain: "peluqueriajuan.com"
      })
    ).toEqual({
      domain: "peluqueriajuan.com"
    });
  });

  it("rejects a URL instead of a hostname", () => {
    expect(() =>
      parseCreateWebsiteIntegrationRequest({
        domain: "https://peluqueriajuan.com"
      })
    ).toThrow();
  });
});
