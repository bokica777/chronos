import { routes } from "../../app/router/routes";
import { RegisterForm } from "../../features/auth/components/RegisterForm";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export function RegisterPage() {
  useDocumentTitle("Registracija");

  return (
    <>
      <h1>Napravi nalog</h1>
      <p>Sakupljaj pogodnosti i zakazuj brže.</p>
      <RegisterForm />
      <p className="auth-switch">
        Već imaš nalog? <a href={routes.login}>Prijavi se</a>
      </p>
    </>
  );
}
