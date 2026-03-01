import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">
          <span className="text-brand-green">Fun</span>
          <span className="text-brand-gold">Betz</span>
        </h1>
        <p className="text-brand-muted mt-2">Create your account</p>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-lg p-6">
        <RegisterForm />
      </div>

      <p className="text-center text-brand-muted text-sm mt-4">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-green hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
