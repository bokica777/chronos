import type { ReactNode } from "react";
import { routes } from "../../../app/router/routes";

type Category = {
  label: string;
  icon: ReactNode;
};

const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const categories: Category[] = [
  {
    label: "Šminka",
    icon: (
      <svg {...iconProps}>
        <rect x="9" y="10" width="6" height="10" rx="1.5" />
        <path d="M9 10 L10 4 L14 4 L15 10 Z" />
      </svg>
    ),
  },
  {
    label: "Frizura",
    icon: (
      <svg {...iconProps}>
        <circle cx="6" cy="6" r="2.4" />
        <circle cx="6" cy="18" r="2.4" />
        <line x1="8.1" y1="7.7" x2="20" y2="20" />
        <line x1="8.1" y1="16.3" x2="20" y2="4" />
      </svg>
    ),
  },
  {
    label: "Sport",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4 C9 8 9 16 12 20" />
        <path d="M4.5 9 C9 11 15 11 19.5 9" />
      </svg>
    ),
  },
  {
    label: "Zdravlje",
    icon: (
      <svg {...iconProps}>
        <path d="M12 20 C6 15 3 11.5 3 8 C3 5.5 5 4 7.2 4 C9 4 10.5 5 12 7 C13.5 5 15 4 16.8 4 C19 4 21 5.5 21 8 C21 11.5 18 15 12 20 Z" />
      </svg>
    ),
  },
  {
    label: "Ostalo",
    icon: (
      <svg {...iconProps}>
        <circle cx="6" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="18" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export function CategoryGrid() {
  return (
    <div className="category-grid">
      {categories.map((category) => (
        <a className="category-card" href={routes.providers} key={category.label}>
          <span className="category-icon">{category.icon}</span>
          <span className="category-label">{category.label}</span>
        </a>
      ))}
    </div>
  );
}
