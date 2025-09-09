// frontend/src/pages/Calendario.jsx
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { io } from 'socket.io-client';
import { api } from '../lib/api';

export default function Calendario() {
  const { id } = useParams();
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [map, setMap] = useState({});
  const sockRef = useRef(null);
  const prevIdRef = useRef(null);

  async function fetchMonth() {
    const r = await api.get(`/specialists/${id}/calendar?month=${month}`);
    setMap(r.data);
  }

  // Carrega o mês atual sempre que id/mês mudarem
  useEffect(() => { fetchMonth(); }, [id, month]);

  // Conexão Socket.IO (uma vez) + troca de salas quando o id muda
  useEffect(() => {
    const URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

    if (!sockRef.current) {
      const socket = io(URL, {
        transports: ['websocket'],
        withCredentials: true,
      });
      sockRef.current = socket;

      // Listener de invalidação: só recarrega se for o especialista e mês visíveis
      socket.on('calendar:invalidate', (p) => {
        if (!p?.specialistId || !p?.date) return;
        if (String(p.specialistId) !== String(id)) return;

        const m = dayjs(p.date).format('YYYY-MM');
        if (m === month) fetchMonth();
      });
    }

    const socket = sockRef.current;

    // entrar/sair da sala correta quando o id mudar
    const prevId = prevIdRef.current;
    if (prevId && String(prevId) !== String(id)) {
      socket.emit('leave:specialist', String(prevId));
    }
    socket.emit('join:specialist', String(id));
    prevIdRef.current = id;

    return () => {
      // Ao desmontar a página, sair da sala e desconectar
      if (sockRef.current) {
        sockRef.current.emit('leave:specialist', String(id));
        sockRef.current.disconnect();
        sockRef.current = null;
      }
    };
  }, [id, month]); // depende de id para join/leave; month só influencia o filtro do fetch no listener

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Selecione a data</h2>

      <div className="flex gap-2 items-center">
        <button
          className="border px-2 py-1 rounded"
          onClick={() =>
            setMonth(dayjs(month + '-01').subtract(1, 'month').format('YYYY-MM'))
          }
        >
          ◀
        </button>
        <div className="font-medium capitalize">
          {dayjs(month + '-01').format('MMMM YYYY')}
        </div>
        <button
          className="border px-2 py-1 rounded"
          onClick={() =>
            setMonth(dayjs(month + '-01').add(1, 'month').format('YYYY-MM'))
          }
        >
          ▶
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {Object.entries(map).map(([date, info]) => (
          <button
            key={date}
            disabled={info.status !== 'OPEN' || info.remaining <= 0}
            className={`border rounded p-2 text-left ${
              info.remaining <= 2 ? 'border-red-400' : ''
            } ${info.status !== 'OPEN' ? 'opacity-50' : ''}`}
            onClick={async () => {
              const r = await api.post('/appointments', { specialistId: id, date });
              window.location.href = r.data.init_point; // redireciona para o MP
            }}
          >
            <div className="text-sm">{date}</div>
            <div className="text-xs">
              Vagas: {info.remaining}/{info.total}
            </div>
            <div className="text-[11px] text-gray-500">{info.status}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
