import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Jeton du cookie qui mémorise l'identité du super admin pendant qu'il navigue sous un
 * autre compte. Signé (HMAC-SHA256) : sans la clé, impossible de le fabriquer pour se
 * faire passer pour le super admin au moment du retour.
 *
 * Fonctions pures, sans dépendance à Next, pour pouvoir les tester.
 */

export const IMPERSONATOR_COOKIE = "impersonator";

function signature(userId: string, key: string): string {
  return createHmac("sha256", key).update(`impersonator:${userId}`).digest("base64url");
}

export function signImpersonator(userId: string, key: string): string {
  return `${userId}.${signature(userId, key)}`;
}

/** Renvoie l'identifiant du super admin si le jeton est intact, sinon `null`. */
export function verifyImpersonator(token: string | undefined, key: string): string | null {
  if (!token) {
    return null;
  }

  const separator = token.lastIndexOf(".");
  if (separator <= 0) {
    return null;
  }

  const userId = token.slice(0, separator);
  const given = Buffer.from(token.slice(separator + 1));
  const expected = Buffer.from(signature(userId, key));

  return given.length === expected.length && timingSafeEqual(given, expected) ? userId : null;
}
