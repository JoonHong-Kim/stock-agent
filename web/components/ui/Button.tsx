import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "solid" | "secondary" | "ghost";

const variantClass: Record<Variant, string> = {
  solid: "btn btn-solid",
  secondary: "btn btn-secondary",
  ghost: "btn btn-ghost",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({
  variant = "solid",
  className = "",
  ...props
}: ButtonProps) {
  const classes = `${variantClass[variant]} ${className}`.trim();
  return <button className={classes} {...props} />;
}

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
};

export function ButtonLink({
  href,
  children,
  variant = "solid",
  className = "",
}: ButtonLinkProps) {
  const classes = `${variantClass[variant]} ${className}`.trim();
  return (
    <Link className={classes} href={href}>
      {children}
    </Link>
  );
}
