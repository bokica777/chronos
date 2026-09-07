import { env } from "../../config/env";
import type { ApiProblem } from "../../models/api";
import { routes } from "../../app/router/routes";

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

// Poziva se kad server odbije token koji smo POSLALI (ne kad je 401 npr.
// pogresna lozinka na /auth/login - tamo se nikakav token ne salje). Ovo je
// jedini pouzdan momenat kad znamo da je sesija "ustajala" (token istekao,
// ili baza/korisnik vise ne postoje posle restarta okruzenja) - ciscenje
// lokalnog stanja i povratak na login sprecava da stranice pokusavaju da
// ucitaju podatke sa nevazecim tokenom i zauvek ostanu u "ne moze da se
// ucita" stanju.
function handleStaleSession() {
  localStorage.removeItem("chronos.token");
  localStorage.removeItem("chronos.user");
  if (window.location.pathname !== routes.login) {
    window.location.assign(routes.login);
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem("chronos.token");

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 401 && token) {
    handleStaleSession();
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    const problem: ApiProblem = {
      message: body?.message ?? "Zahtev nije uspeo.",
      status: response.status,
    };
    throw problem;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function upload<T>(path: string, file: File): Promise<T> {
  const token = localStorage.getItem("chronos.token");
  const formData = new FormData();
  formData.append("file", file);

  // Ne postavljamo Content-Type rucno - browser sam doda multipart boundary.
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    const problem: ApiProblem = {
      message: body?.message ?? "Otpremanje nije uspelo.",
      status: response.status,
    };
    throw problem;
  }

  return (await response.json()) as T;
}

export const httpClient = {
  get: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, { method: "GET", signal }),
  post: <TResponse, TBody>(path: string, body: TBody) =>
    request<TResponse>(path, { method: "POST", body }),
  put: <TResponse, TBody>(path: string, body: TBody) =>
    request<TResponse>(path, { method: "PUT", body }),
  patch: <TResponse, TBody>(path: string, body: TBody) =>
    request<TResponse>(path, { method: "PATCH", body }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
  upload: <T>(path: string, file: File) => upload<T>(path, file),
};
