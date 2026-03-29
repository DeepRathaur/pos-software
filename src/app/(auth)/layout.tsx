import { AuthBackdrop } from "@/components/auth/AuthBackdrop";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-stitch-bg font-sans text-stitch-fg">
      <AuthBackdrop />
      {children}
    </div>
  );
}
