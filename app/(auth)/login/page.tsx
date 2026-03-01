import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">
          <span className="text-brand-green">Fun</span>
          <span className="text-brand-gold">Betz</span>
        </h1>
        <p className="text-brand-muted mt-2">Sign in to your account</p>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-lg p-6">
        <LoginForm />
      </div>

      <p className="text-center text-brand-muted text-sm mt-4">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-brand-green hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
