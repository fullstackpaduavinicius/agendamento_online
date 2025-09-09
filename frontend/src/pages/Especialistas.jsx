import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function Especialistas() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get('/specialists').then(r => setItems(r.data)); }, []);
  return (
    <section className="grid md:grid-cols-2 gap-4">
      {items.map(s => (
        <div key={s.id} className="border rounded p-4">
          <h3 className="font-semibold">{s.name}</h3>
          <p className="text-sm text-gray-600">{s.specialty}</p>
          <Link className="text-blue-600" to={`/especialistas/${s.id}`}>Ver perfil</Link>
        </div>
      ))}
    </section>
  );
}
