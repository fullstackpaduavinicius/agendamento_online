import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import dayjs from "dayjs";

const brl = (cents) => (cents == null ? '-' : (cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));

export default function MinhasConsultas() {
  const [params] = useSearchParams();
  const status = params.get("status"); // success | failure | pending
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const statusMsg =
    status === "success"
      ? "Pagamento aprovado! Sua vaga está garantida."
      : status === "failure"
      ? "Pagamento falhou. Você pode tentar novamente."
      : status === "pending"
      ? "Pagamento pendente. Aguarde a confirmação."
      : null;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await api.get("/me/appointments");
        if (mounted) setItems(r.data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  async function cancelar(id) {
    if (!confirm("Confirmar cancelamento?")) return;
    await api.post(`/appointments/${id}/cancel`);
    // refetch
    const r = await api.get("/me/appointments");
    setItems(r.data);
    alert("Consulta cancelada.");
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">Minhas Consultas</h1>

      {statusMsg && (
        <div className="rounded border p-3 bg-gray-50">{statusMsg}</div>
      )}

      {loading ? (
        <div>Carregando…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-600">
          Você ainda não possui consultas.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div key={a.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{a.specialist?.name} · {a.specialist?.specialty}</div>
                <div className="text-sm text-gray-600">
                  Data: {dayjs(a.date).format("DD/MM/YYYY")} · Status: {a.status}
                  {a.queueToken ? ` · Fila: ${a.queueToken}` : ''}
                </div>
                <div className="text-sm">{brl(a.amountCents)}</div>
              </div>
              {a.status !== 'CANCELED' && a.status !== 'SERVED' && (
                <button
                  className="text-red-600 border border-red-300 px-3 py-1 rounded"
                  onClick={() => cancelar(a.id)}
                >
                  Cancelar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Link
        to="/especialistas"
        className="inline-block bg-blue-600 text-white px-4 py-2 rounded"
      >
        Agendar nova consulta
      </Link>
    </section>
  );
}
