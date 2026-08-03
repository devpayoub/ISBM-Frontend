"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { fetchClient } from "@/lib/api/client";
import { PasswordInput } from "@/components/ui/password-input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetchClient<{ access: string; refresh: string; user: any }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setTokens(response.access, response.refresh);
      if (response.user) setUser(response.user);
      // Suppliers have no access to the internal dashboard — land them
      // straight on their ticket portal instead.
      router.push(response.user?.role === "SUPPLIER" ? "/support" : "/");
    } catch (err: any) {
      setError("Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-card rounded-md shadow-sm border">
        <h1 className="text-2xl font-heading mb-2 text-foreground uppercase tracking-widest text-center">
          ISBM
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-6">Supervision Atelier</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-sans mb-1 text-muted-foreground">
              Email
            </label>
            <input 
              type="email" 
              className="w-full border p-2 rounded-md bg-input text-foreground outline-none focus:ring-1 focus:ring-ring"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="prenom.nom@isbm.tn"
            />
          </div>
          <div>
            <label className="block text-sm font-sans mb-1 text-muted-foreground">
              Mot de passe
            </label>
            <PasswordInput
              className="border bg-input text-foreground outline-none focus:ring-1 focus:ring-ring focus:border-transparent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground p-2 rounded-md font-sans hover:brightness-110 transition disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
