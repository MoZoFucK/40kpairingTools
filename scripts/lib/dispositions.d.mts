// Types du module de tirage, pour que les tests TypeScript puissent l'importer.
export declare const DISPOSITION_VALUES: readonly string[];

export declare function drawTeamDispositions(
  count: number,
  options?: { alreadySet?: readonly string[]; random?: () => number },
): string[];
