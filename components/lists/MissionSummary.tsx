import { Fragment } from "react";

/**
 * Rend l'emphase légère des résumés de mission : `**gras**` et `` `terme` ``.
 *
 * Écrit à la main plutôt qu'avec une bibliothèque Markdown : le besoin tient en deux
 * marqueurs, et surtout le texte reste du texte — il est découpé puis rendu en éléments
 * React, jamais injecté en HTML. Aucune surface d'injection, aucune dépendance.
 *
 * Les valeurs de points sont ce que le joueur cherche en premier ; sans emphase, ces
 * résumés deviennent des pavés illisibles.
 */
export function MissionSummary({
  summary,
  className,
}: {
  summary: string;
  className?: string;
}) {
  // Découpe en conservant les délimiteurs, pour reconstituer le texte à l'identique.
  const segments = summary.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return (
    <p className={className}>
      {segments.map((segment, index) => {
        if (segment.startsWith("**") && segment.endsWith("**")) {
          return <strong key={index}>{segment.slice(2, -2)}</strong>;
        }
        if (segment.startsWith("`") && segment.endsWith("`") && segment.length > 2) {
          return (
            <code key={index} className="text-body">
              {segment.slice(1, -1)}
            </code>
          );
        }
        return <Fragment key={index}>{segment}</Fragment>;
      })}
    </p>
  );
}
