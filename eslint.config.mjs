import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * Cahier des charges §1 et §58 : aucun composant, endpoint, service ou utilitaire ne doit
 * produire une recommandation stratégique. Cette règle rend la contrainte vérifiable en CI
 * plutôt que dépendante de la discipline du développeur.
 */
const FORBIDDEN_TERMS = [
  "best",
  "recommend",
  "recommand",
  "optimal",
  "optimiz",
  "optimis",
  "suggest",
  "rank",
  "meilleur",
];

/**
 * Un terme compte s'il ouvre un mot, jamais au milieu d'un autre.
 *
 * Une simple recherche de sous-chaîne insensible à la casse produit des faux positifs :
 * `describeStoredAction` contient « beSt ». On exige donc que le terme commence
 * l'identifiant (`bestPairing`), ouvre un mot en camelCase (`getBestPairing`) ou apparaisse
 * en majuscules (`BEST_PAIRING`).
 */
const capitalize = (term) => term[0].toUpperCase() + term.slice(1);

const FORBIDDEN_NAME = new RegExp(
  [
    `^(?:${FORBIDDEN_TERMS.join("|")})`,
    FORBIDDEN_TERMS.map(capitalize).join("|"),
    FORBIDDEN_TERMS.map((term) => term.toUpperCase()).join("|"),
  ].join("|"),
);

const noRecommendation = {
  files: ["lib/pairing/**/*.{ts,tsx}", "components/pairing/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: `Identifier[name=${FORBIDDEN_NAME}]`,
        message:
          "Interdit (cahier des charges §58) : le moteur et l'UI de pairing ne doivent produire aucune recommandation stratégique. Le coach décide seul.",
      },
    ],
  },
};

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  noRecommendation,
];

export default config;
