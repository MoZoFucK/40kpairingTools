import { ESTIMATE_SCALE } from "@/lib/estimates/scale";

export default function HomePage() {
  return (
    <div className="container py-5">
      <h1 className="h3 mb-1">40K Team Pairing Assistant</h1>
      <p className="text-body-secondary">
        Assistant de pairing pour tournois par équipes. Le coach prend les décisions,
        l&apos;outil se contente de restituer les données et les conséquences mécaniques.
      </p>

      <h2 className="h6 mt-4">Échelle des estimés</h2>
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
    </div>
  );
}
