"use client";

import { ReactNode } from "react";
import AppHeader from "@/components/app-header";
import { AuthUser } from "@/lib/api";

const temporaryUser: AuthUser = {
  username: "guest",
  display_name: "Acesso temporário",
};

export default function AuthGate({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <AppHeader user={temporaryUser} />
      <div className="app-shell__content">{children}</div>
    </div>
  );
}
