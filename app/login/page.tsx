import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Connexion — 40K Team Pairing Assistant" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string; erreur?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const { suite, erreur } = await searchParams;

  return (
    <div className="container py-5" style={{ maxWidth: "26rem" }}>
      <h1 className="h4 mb-4">Connexion</h1>
      {erreur === "lien" ? (
        <div className="alert alert-warning py-2" role="alert">
          Ce lien a expiré ou a déjà servi. Redemande-en un avec « Mot de passe oublié ».
        </div>
      ) : null}
      <div className="card">
        <div className="card-body">
          <LoginForm suite={suite ?? "/dashboard"} />
        </div>
      </div>
    </div>
  );
}
