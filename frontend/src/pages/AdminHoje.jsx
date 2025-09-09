import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import dayjs from 'dayjs';
import { useAuth } from '../store/auth';
import { useSearchParams } from 'react-router-dom';

export default function AdminHoje() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [specs, setSpecs] = useState([]);
  const [sel, setSel] = useState(params.get('specialistId') || '');
  const [date, setDate] = useState(params.get('date') || dayjs().format('YYYY-MM-DD'));
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'ADMIN') return;
    api.get('/specialists').then(r => setSpecs(r.data));
  }, [user]);

  async function load() {
    if (!sel) return;
    const r = await api.get(`/admin/today?specialistId=${sel}&date=${date}`);
    setItems(r.data);
    setParams({ specialistId: sel, date });
  }

  useEffect(() => { load(); }, [sel, date]);

  if (!user) return <div>Carregando…</div>;
  if (user.role !== 'ADMIN') return <div>Acesso negado.</div>;

  async function setStatus(id, status) {
    await api.post(`/admin/appointments/${id}/status`, { status });
    await load();
  }

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-bold">Operação de hoje</h1>

      <div className="flex gap-2 items-center">
        <select className="border p-2 rounded" value={sel} onChange={e => setSel(e.target.value)}>
          <option value="">Selecione o especialista</option>
          {specs.map(s => <option key={s.id} value={s.id}>{s.name} — {s.specialty}</option>)}
        </select>
        <input type="date" className="border p-2 rounded" value={date} onChange={e => setDate(e.target.value)} />
        <button className="border px-3 py-2 rounded" onClick={load}>Atualizar</button>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {['PENDING','PAID','SERVED'].map(col => (
          <div key={col} className="border rounded p-2">
            <div className="font-semibold mb-2">{col === 'PENDING' ? 'Aguardando Pagamento' : col === 'PAID' ? 'Aguardando Atendimento' : 'Concluídos'}</div>
            <div className="space-y-2">
              {items.filter(i => i.status === col).map(i => (
                <div key={i.id} className="border rounded p-2">
                  <div className="text-sm font-medium">{i.user?.name || 'Paciente'}</div>
                  <div className="text-xs text-gray-600">Fila #{i.queueToken || '-'}</div>
                  {col === 'PAID' && (
                    <div className="flex gap-2 mt-2">
                      <button className="px-2 py-1 border rounded" onClick={() => setStatus(i.id, 'SERVED')}>Concluir</button>
                      <button className="px-2 py-1 border rounded" onClick={() => setStatus(i.id, 'NO_SHOW')}>No-show</button>
                    </div>
                  )}
                  {col === 'PENDING' && <div className="text-xs text-gray-500 mt-2">Aguardando confirmação do pagamento...</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="border rounded p-2">
          <div className="font-semibold mb-2">No-show</div>
          <div className="space-y-2">
            {items.filter(i => i.status === 'NO_SHOW').map(i => (
              <div key={i.id} className="border rounded p-2">
                <div className="text-sm font-medium">{i.user?.name || 'Paciente'}</div>
                <div className="text-xs text-gray-600">Fila #{i.queueToken || '-'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}
