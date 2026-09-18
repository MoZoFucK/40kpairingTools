/**
 * Accès aux variables d'environnement, avec des messages compréhensibles (§37).
 *
 * Les `process.env.X` sont écrits en toutes lettres : Next remplace ces expressions à la
 * compilation, un accès dynamique ne fonctionnerait pas côté navigateur.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante : ${name}. Copier .env.example vers .env.local et la renseigner.`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
}

export function supabasePublishableKey(): string {
  return required(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

/** Serveur uniquement. Ne jamais importer depuis un composant client. */
export function supabaseSecretKey(): string {
  return required(process.env.SUPABASE_SECRET_KEY, "SUPABASE_SECRET_KEY");
}
