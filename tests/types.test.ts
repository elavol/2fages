import { describe, it, expect } from "vitest";
import {
  type Account,
  type Namespace,
  getAlgorithm,
  getDigits,
  getPeriod,
} from "../src/types";

describe("getAlgorithm", () => {
  it("returns SHA1 for empty string", () => {
    expect(getAlgorithm("")).toBe("SHA1");
  });
  it("returns SHA256 for sha256", () => {
    expect(getAlgorithm("sha256")).toBe("SHA256");
  });
  it("returns SHA512 for sha512", () => {
    expect(getAlgorithm("sha512")).toBe("SHA512");
  });
  it("returns SHA1 for unknown value", () => {
    expect(getAlgorithm("md5")).toBe("SHA1");
  });
});

describe("getDigits", () => {
  it("returns 6 for 0", () => {
    expect(getDigits(0)).toBe(6);
  });
  it("returns 8 for 8", () => {
    expect(getDigits(8)).toBe(8);
  });
});

describe("getPeriod", () => {
  it("returns 30 for 0", () => {
    expect(getPeriod(0)).toBe(30);
  });
  it("returns 60 for 60", () => {
    expect(getPeriod(60)).toBe(60);
  });
});
