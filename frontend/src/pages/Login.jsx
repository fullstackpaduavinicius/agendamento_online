import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setAuth } from "../lib/api";

export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState("login"); // login | register
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      if (mode === "register") {
        const r = await api.post("/auth/register", { name, email, password });
        const { token } = r.data;
        localStorage.setItem("token", token);
        setAuth(token);
      } else {
        const r = await api.post("/auth/login", { email, password });
        const { token } = r.data;
        localStorage.setItem("token", token);
        setAuth(token);
      }
      nav("/especialistas");
    } catch (e) {
      setErr(e?.response?.data?.error || "Erro ao autenticar");
    }
  }

  return (
    <section className="max-w-sm mx-auto space-y-4">
      <h1 className="text-xl font-bold">
        {mode === "login" ? "Entrar" : "Criar conta"}
      </h1>

      {err && <div className="border p-2 rounded bg-red-50">{err}</div>}

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "register" && (
          <div>
            <label className="block text-sm mb-1">Nome</label>
            <input
              className="w-full border p-2 rounded"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
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
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white px-4 py-2 rounded"
        >
          {mode === "login" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <button
        className="text-blue-600 text-sm"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login"
          ? "Não tem conta? Criar agora"
          : "Já tem conta? Entrar"}
      </button>
    </section>
  );
}
