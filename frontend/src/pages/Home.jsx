import { Link } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function Home() {
  const { user } = useAuth();

  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-bold">Agende sozinho. Sem filas.</h1>
      <p>Atendimento por ordem de chegada. Capacidade por dia com vagas em tempo real.</p>

      {user?.role === "ADMIN" && (
        <Link
          to="/admin/hoje"
          className="inline-block bg-black text-white px-4 py-2 rounded"
        >
          Ir para Admin
        </Link>
      )}
    </section>
  );
}
