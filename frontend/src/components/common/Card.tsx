import type { PropsWithChildren } from "react";

type CardProps = PropsWithChildren<{ className?: string }>;

export function Card({ children, className = "" }: CardProps) {
  return <article className={`card ${className}`.trim()}>{children}</article>;
}
