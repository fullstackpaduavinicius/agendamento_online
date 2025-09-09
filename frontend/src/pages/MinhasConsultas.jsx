import { useSearchParams, Link } from "react-router-dom";

export default function MinhasConsultas() {
  const [params] = useSearchParams();
  const status = params.get("status"); // success | failure | pending

  const statusMsg =
    status === "success"
      ? "Pagamento aprovado! Sua vaga está garantida."
      : status === "failure"
      ? "Pagamento falhou. Você pode tentar novamente."
      : status === "pending"
      ? "Pagamento pendente. Aguarde a confirmação."
      : null;

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">Minhas Consultas</h1>

      {statusMsg && (
        <div className="rounded border p-3 bg-gray-50">{statusMsg}</div>
      )}

      {/* TODO: listar consultas do usuário quando criarmos o endpoint /me */}
      <p className="text-sm text-gray-600">
        Aqui você verá seus agendamentos (pago, confirmado, cancelado) assim que
        conectarmos com a API.
      </p>

      <Link
        to="/especialistas"
        className="inline-block bg-blue-600 text-white px-4 py-2 rounded"
      >
        Ver especialistas
      </Link>
    </section>
  );
}
