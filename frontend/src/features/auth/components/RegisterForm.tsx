import { useState, type FormEvent } from "react";
import { Button } from "../../../components/common/Button";
import { authService } from "../../../services/authService";
import type { ApiProblem } from "../../../models/api";
import type { UserRole } from "../../../models/user";
import { useAuth } from "../../../store/useAuth";

function registerErrorMessage(error: ApiProblem): string {
  switch (error.status) {
    case 409:
      return "Nalog sa ovim email-om već postoji.";
    default:
      return "Registracija nije uspela. Pokušaj ponovo.";
  }
}

export function RegisterForm() {
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("Client");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Lozinke se ne poklapaju.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.register({ email, displayName, password, role });
      const loginResult = await authService.login({ email, password });
      localStorage.setItem("chronos.token", loginResult.accessToken);
      setUser(loginResult.user);
      window.location.assign("/");
    } catch (error) {
      setErrorMessage(registerErrorMessage(error as ApiProblem));
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      {errorMessage && <p className="form-error">{errorMessage}</p>}
      <div className="role-picker" role="radiogroup" aria-label="Vrsta naloga">
        <label className={`role-option${role === "Client" ? " is-selected" : ""}`}>
          <input
            type="radio"
            name="role"
            value="Client"
            checked={role === "Client"}
            onChange={() => setRole("Client")}
          />
          <span className="role-option-title">Klijent</span>
          <span className="role-option-desc">Zakazujem termine kod pružalaca usluga.</span>
        </label>
        <label className={`role-option${role === "Partner" ? " is-selected" : ""}`}>
          <input
            type="radio"
            name="role"
            value="Partner"
            checked={role === "Partner"}
            onChange={() => setRole("Partner")}
          />
          <span className="role-option-title">Partner</span>
          <span className="role-option-desc">Nudim usluge i primam rezervacije.</span>
        </label>
      </div>
      <label>
        Ime
        <input
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
        />
      </label>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label>
        Lozinka
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      <label>
        Potvrdi lozinku
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </label>
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Kreiranje naloga..." : "Registruj se"}
      </Button>
    </form>
  );
}
