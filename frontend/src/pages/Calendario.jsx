import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { api } from '../lib/api';

export default function Calendario() {
  const { id } = useParams();
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [map, setMap] = useState({});

  useEffect(() => {
    api.get(`/specialists/${id}/calendar?month=${month}`).then(r => setMap(r.data));
  }, [id, month]);

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Selecione a data</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {Object.entries(map).map(([date, info]) => (
          <button key={date}
            disabled={info.status !== 'OPEN' || info.remaining <= 0}
            className={`border rounded p-2 text-left ${info.remaining <= 2 ? 'border-red-400' : ''} ${info.status!=='OPEN'?'opacity-50':''}`}
            onClick={async () => {
              const r = await api.post('/appointments', { specialistId: id, date });
              window.location.href = r.data.init_point; // redireciona para o MP
            }}>
            <div className="text-sm">{date}</div>
            <div className="text-xs">Vagas: {info.remaining}/{info.total}</div>
            <div className="text-[11px] text-gray-500">{info.status}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
