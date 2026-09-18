import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Connexion — 40K Team Pairing Assistant" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const { suite } = await searchParams;

  return (
    <div className="container py-5" style={{ maxWidth: "26rem" }}>
      <h1 className="h4 mb-4">Connexion</h1>
      <div className="card">
        <div className="card-body">
          <LoginForm suite={suite ?? "/dashboard"} />
        </div>
      </div>
    </div>
  );
}
