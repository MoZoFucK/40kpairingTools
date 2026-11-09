import { describe, expect, it } from "vitest";
import { signImpersonator, verifyImpersonator } from "@/lib/auth/impersonation";

const KEY = "clé-de-test";
const ID = "1d74b540-f35f-446c-a3b1-5882bad316c0";

describe("jeton du super admin en navigation sous un autre compte", () => {
  it("relit l'identifiant d'un jeton intact", () => {
    expect(verifyImpersonator(signImpersonator(ID, KEY), KEY)).toBe(ID);
  });

  it("refuse un identifiant remplacé", () => {
    const token = signImpersonator(ID, KEY);
    const forged = `00000000-0000-0000-0000-000000000000${token.slice(ID.length)}`;
    expect(verifyImpersonator(forged, KEY)).toBeNull();
  });

  it("refuse un jeton signé avec une autre clé", () => {
    expect(verifyImpersonator(signImpersonator(ID, "autre"), KEY)).toBeNull();
  });

  it("refuse un jeton absent ou mal formé", () => {
    expect(verifyImpersonator(undefined, KEY)).toBeNull();
    expect(verifyImpersonator("", KEY)).toBeNull();
    expect(verifyImpersonator(ID, KEY)).toBeNull();
    expect(verifyImpersonator(`${ID}.`, KEY)).toBeNull();
  });
});
