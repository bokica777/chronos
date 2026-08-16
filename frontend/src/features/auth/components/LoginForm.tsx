import { useState, type FormEvent } from "react";
import { Button } from "../../../components/common/Button";
import { authService } from "../../../services/authService";
import type { ApiProblem } from "../../../models/api";
import { useAuth } from "../../../store/useAuth";

function loginErrorMessage(error: ApiProblem): string {
  switch (error.status) {
    case 404:
      return "Nalog sa ovim email-om ne postoji.";
    case 401:
      return "Pogrešna lozinka.";
    default:
      return "Prijava nije uspela. Pokušaj ponovo.";
  }
}

export function LoginForm() {
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await authService.login({ email, password });
      localStorage.setItem("chronos.token", result.accessToken);
      setUser(result.user);
      window.location.assign("/");
    } catch (error) {
      setErrorMessage(loginErrorMessage(error as ApiProblem));
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      {errorMessage && <p className="form-error">{errorMessage}</p>}
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
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Prijavljivanje..." : "Prijavi se"}
      </Button>
    </form>
  );
}
