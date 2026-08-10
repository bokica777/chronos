import { LoginForm } from "../../features/auth/components/LoginForm";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export function LoginPage() {
  useDocumentTitle("Prijava");

  return (
    <>
      <h1>Dobro došli nazad</h1>
      <p>Prijavite se da biste upravljali rezervacijama.</p>
      <LoginForm />
    </>
  );
}
