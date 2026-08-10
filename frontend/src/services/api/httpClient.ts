import { env } from "../../config/env";
import type { ApiProblem } from "../../models/api";

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => ({
      title: "Zahtev nije uspeo",
      status: response.status,
    }))) as ApiProblem;
    throw problem;
  }

  if (response.status === 204) {
    return undefined as T;
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
};
