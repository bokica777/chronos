import { useState, type FormEvent } from "react";
import { Button } from "../../../components/common/Button";
import { authService } from "../../../services/authService";
import { useAuth } from "../../../store/useAuth";

export function LoginForm() {
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const user = await authService.login({ email, password });
      setUser(user);
      window.location.assign("/");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
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
