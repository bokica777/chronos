import { routes } from "../../app/router/routes";
import { LoginForm } from "../../features/auth/components/LoginForm";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export function LoginPage() {
  useDocumentTitle("Prijava");

  return (
    <>
      <h1>Dobro došli nazad</h1>
      <p>Prijavite se da biste upravljali rezervacijama.</p>
      <LoginForm />
      <p className="auth-switch">
        Nemaš nalog? <a href={routes.register}>Registruj se</a>
      </p>
    </>
  );
}
