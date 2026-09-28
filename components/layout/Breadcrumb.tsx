import Link from "next/link";
import type { Crumb } from "@/lib/navigation/trail";

/**
 * Fil d'Ariane.
 *
 * La piste est fournie par la page plutôt que déduite de l'URL : les segments sont des
 * identifiants techniques, et un fil d'Ariane affichant un UUID n'aide personne. Le nom
 * du tournoi et le numéro de ronde ne sont connus qu'après lecture en base.
 *
 * Les pistes se construisent avec les fonctions de `lib/navigation/trail`.
 */
export function Breadcrumb({ items }: { items: readonly Crumb[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="fil d'Ariane">
      <ol className="breadcrumb app-breadcrumb mb-3">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li
              key={`${item.label}-${index}`}
              className={`breadcrumb-item${isLast ? " active" : ""}`}
              {...(isLast ? { "aria-current": "page" as const } : {})}
            >
              {item.href && !isLast ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                item.label
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
