import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function Especialista() {
  const { id } = useParams();
  const [spec, setSpec] = useState(null);
  useEffect(() => { api.get(`/specialists/${id}`).then(r => setSpec(r.data)); }, [id]);
  if (!spec) return null;
  return (
    <section className="space-y-3">
      <h1 className="text-xl font-bold">{spec.name}</h1>
      <p className="text-gray-600">{spec.specialty}</p>
      <Link className="inline-block bg-blue-600 text-white px-4 py-2 rounded"
            to={`/especialistas/${id}/calendario`}>
        Agendar
      </Link>
    </section>
  );
}
