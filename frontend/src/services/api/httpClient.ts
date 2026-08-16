import { env } from "../../config/env";
import type { ApiProblem } from "../../models/api";

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

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
