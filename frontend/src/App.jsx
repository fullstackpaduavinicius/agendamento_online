import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Especialistas from './pages/Especialistas';
import Especialista from './pages/Especialista';
import Calendario from './pages/Calendario';
import MinhasConsultas from './pages/MinhasConsultas';
import Login from './pages/Login';

export default function App() {
  return (
    <BrowserRouter>
      <div className="max-w-6xl mx-auto p-4">
        <header className="flex items-center justify-between py-3">
          <Link to="/" className="font-bold">Clínica</Link>
          <nav className="space-x-4">
            <Link to="/especialistas">Especialistas</Link>
            <Link to="/entrar">Entrar</Link>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/especialistas" element={<Especialistas />} />
          <Route path="/especialistas/:id" element={<Especialista />} />
          <Route path="/especialistas/:id/calendario" element={<Calendario />} />
          <Route path="/minhas-consultas" element={<MinhasConsultas />} />
          <Route path="/entrar" element={<Login />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
