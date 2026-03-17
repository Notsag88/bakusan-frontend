import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
    LayoutDashboard, Package, Wrench, Calculator, PieChart,
    Tags, Menu, X, History, BookOpen, LogOut
} from "lucide-react";
import { supabase } from "@/lib/supabase"; // <-- IMPORTAMOS SUPABASE

export default function AppLayout() {
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const menuItems = [
        { name: "Resumen", path: "/", icon: <LayoutDashboard size={20} /> },
        { name: "Insumos", path: "/materiales", icon: <Package size={20} /> },
        { name: "Categorías", path: "/categorias", icon: <Tags size={20} /> },
        { name: "Maquinaria", path: "/maquinas", icon: <Wrench size={20} /> },
        { name: "Catálogo", path: "/catalogo", icon: <BookOpen size={20} /> },
        { name: "Cotizador", path: "/cotizador", icon: <Calculator size={20} /> },
        { name: "Historial", path: "/historial", icon: <History size={20} /> },
        { name: "Estadísticas", path: "/estadisticas", icon: <PieChart size={20} /> },
    ];

    const handleLinkClick = () => {
        setIsMobileMenuOpen(false);
    };

    // --- FUNCIÓN PARA CERRAR SESIÓN ---
    const handleLogout = async () => {
        await supabase.auth.signOut();
        // Al cerrar sesión, el Guardián de App.tsx nos va a patear al Login automáticamente
    };

    return (
        <div className="flex h-screen bg-baku-mint/20 font-sans antialiased overflow-hidden">

            <div className="md:hidden flex items-center justify-between bg-baku-deep p-4 text-white shadow-md absolute w-full z-40">
                <div className="flex items-center space-x-2">
                    <h1 className="text-xl font-black tracking-tighter italic text-baku-pink">
                        BAKU-SAN
                    </h1>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 hover:bg-baku-purple/30 rounded-lg transition-colors"
                >
                    <Menu size={24} />
                </button>
            </div>

            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-baku-deep text-white shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="p-6 flex items-center justify-between md:justify-center border-b border-baku-purple/30">
                    <div className="flex flex-col items-center">
                        <h1 className="text-3xl font-black tracking-tighter italic text-baku-pink">
                            BAKU-SAN
                        </h1>
                        <p className="text-xs text-baku-mint mt-1 tracking-widest uppercase">ERP System</p>
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="md:hidden p-1 text-slate-300 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                onClick={handleLinkClick}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                                    isActive
                                        ? "bg-baku-purple text-white font-semibold shadow-md"
                                        : "text-baku-purple/70 hover:bg-baku-purple/20 hover:text-white"
                                }`}
                            >
                                {item.icon}
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* --- BOTÓN DE CERRAR SESIÓN --- */}
                <div className="px-4 py-4 border-t border-baku-purple/30">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-baku-pink/80 hover:bg-baku-pink/10 hover:text-baku-pink transition-all duration-200"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Cerrar Sesión</span>
                    </button>
                </div>

                <div className="pb-4 text-center text-xs text-baku-purple/50">
                    Baku-San v1.0 © 2026
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto pt-16 md:pt-0 relative z-0">
                <Outlet />
            </main>
        </div>
    );
}