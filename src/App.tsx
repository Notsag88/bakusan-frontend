import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Home from "./pages/Home";
import Materiales from "./pages/Materiales";
import Maquinas from "./pages/Maquinas";
import Categorias from "./pages/Categorias";
import Cotizador from "./pages/Cotizador";
import Historial from "./pages/Historial";
import Estadisticas from "./pages/Estadisticas";
import Catalogo from "./pages/Catalogo";
import Login from "./pages/Login"; // <-- Importamos la nueva pantalla
import { supabase } from "./lib/supabase"; // <-- Importamos el cliente de seguridad

function App() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Apenas carga la app, preguntamos si ya hay alguien logueado
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // 2. Nos quedamos escuchando si alguien inicia o cierra sesión en vivo
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Pantalla de carga mientras Supabase verifica la identidad
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-baku-purple font-bold animate-pulse bg-slate-50">
                Verificando credenciales...
            </div>
        );
    }

    // SI NO HAY SESIÓN: Bloqueamos la app y mostramos solo el Login
    if (!session) {
        return <Login />;
    }

    // SI HAY SESIÓN: Mostramos tu sistema completo
    return (
        <BrowserRouter>
            <Routes>
                {/* La ruta padre "/" carga el Layout (el menú lateral) */}
                <Route path="/" element={<AppLayout />}>
                    {/* Estas son las páginas que se inyectan adentro del Layout */}
                    <Route index element={<Home />} />
                    <Route path="materiales" element={<Materiales />} />
                    <Route path="maquinas" element={<Maquinas />} />
                    <Route path="categorias" element={<Categorias />} />
                    <Route path="catalogo" element={<Catalogo />} />
                    <Route path="cotizador" element={<Cotizador />} />
                    <Route path="historial" element={<Historial />} />
                    <Route path="estadisticas" element={<Estadisticas />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;