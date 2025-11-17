"use client";

import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function AppProviders({ children }: Props) {
  return <>{children}</>;
}
