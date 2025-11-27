"use client";

import { usePermissions } from "@/hooks/usePermissions";
import { redirect } from "next/navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { permissions, isAdmin } = usePermissions();
  if (permissions.length > 0 || isAdmin) {
    return redirect("/dashboard");
  }
  return <>{children}</>;
}
