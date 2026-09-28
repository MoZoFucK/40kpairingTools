import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { ESTIMATE_SCALE } from "@/lib/estimates/scale";

/**
 * Page d'accueil.
 *
 * Elle n'a qu'un seul travail : donner une porte d'entrée. Un visiteur non connecté
 * n'a rien à y lire d'autre que « se connecter » ; un utilisateur connecté n'a aucune
 * raison de s'y attarder et repart vers son tableau de bord.
 */
export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="container py-5" style={{ maxWidth: "52rem" }}>
      <section className="mb-5">
        <p className="text-uppercase text-body-secondary small mb-2" style={{ letterSpacing: "0.2em" }}>
          Warhammer 40 000 — tournois par équipes
        </p>
        <h1 className="display-6 mb-3">Assistant de pairing</h1>
        <p className="lead text-body-secondary mb-4">
          Le coach prend les décisions. L&apos;outil se contente de restituer les
          données et les conséquences mécaniques du protocole — il ne classe rien, ne
          conseille rien, ne prédit rien.
        </p>

        <div className="d-flex flex-wrap gap-2">
          {user ? (
            <Link href="/dashboard" className="btn btn-primary">
              Ouvrir mon tableau de bord
            </Link>
          ) : (
            <Link href="/login" className="btn btn-primary">
              Se connecter
            </Link>
          )}
          <Link href="/tournaments" className="btn btn-outline-secondary">
            Voir les tournois
          </Link>
        </div>
      </section>

      <section className="row g-3 mb-5">
        {[
          {
            title: "Les joueurs estiment",
            body: "Chacun note ses matchs possibles face à l'équipe adverse, liste et mission primaire sous les yeux.",
          },
          {
            title: "Le coach voit tout",
            body: "La matrice se remplit en direct. Aucun estimé n'est moyenné ni pondéré : les chiffres sont ceux des joueurs.",
          },
          {
            title: "Le pairing se déroule",
            body: "Chaque étape du protocole est jouée pas à pas, et chaque action reste annulable jusqu'à la validation.",
          },
        ].map((card) => (
          <div key={card.title} className="col-12 col-md-4">
            <div className="card h-100">
              <div className="card-body">
                <h2 className="h6 mb-2">{card.title}</h2>
                <p className="small text-body-secondary mb-0">{card.body}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="h6 mb-3">Échelle des estimés</h2>
        <ul className="list-group list-group-flush" style={{ maxWidth: "24rem" }}>
          {ESTIMATE_SCALE.map((level) => (
            <li
              key={level.value}
              className={`list-group-item d-flex justify-content-between ${level.className}`}
            >
              <span className="fw-semibold">{level.value}</span>
              <span>{level.label}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
