import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  tone?: "accent" | "neutral" | "success" | "danger" | "warning";
  className?: string;
  style?: React.CSSProperties;
};

export function Badge({ children, tone = "accent", className = "", style }: Props) {
  let toneClass = "badge badge--accent";
  if (tone === "neutral") toneClass = "badge badge--neutral";
  else if (tone === "success") toneClass = "badge badge--success";
  else if (tone === "danger") toneClass = "badge badge--danger";
  else if (tone === "warning") toneClass = "badge badge--warning";

  return <span className={`${toneClass} ${className}`.trim()} style={style}>{children}</span>;
}

