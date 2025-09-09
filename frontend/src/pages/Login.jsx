// frontend/src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function Login() {
  const nav = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "register") {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      nav("/especialistas");
    } catch (e) {
      // tenta extrair mensagem amigável do backend
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        "Erro ao autenticar";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-sm mx-auto space-y-4">
      <h1 className="text-xl font-bold">
        {mode === "login" ? "Entrar" : "Criar conta"}
      </h1>

      {err && (
        <div className="border p-2 rounded bg-red-50 text-red-700 text-sm">
          {err}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "register" && (
          <div>
            <label className="block text-sm mb-1">Nome</label>
            <input
              className="w-full border p-2 rounded"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        )}

        <div>
          <label className="block text-sm mb-1">E-mail</label>
          <input
            type="email"
            className="w-full border p-2 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Senha</label>
          <input
            type="password"
            className="w-full border p-2 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
          disabled={loading}
        >
          {loading
            ? "Aguarde..."
            : mode === "login"
            ? "Entrar"
            : "Criar conta"}
        </button>
      </form>

      <button
        type="button"
        className="text-blue-600 text-sm"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        disabled={loading}
      >
        {mode === "login"
          ? "Não tem conta? Criar agora"
          : "Já tem conta? Entrar"}
      </button>
    </section>
  );
}
