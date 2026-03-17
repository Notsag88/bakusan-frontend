import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
    PieChart, Pie, LineChart, Line, BarChart, Bar
} from "recharts";
import { PieChart as PieChartIcon, TrendingUp, DollarSign, Receipt, Package, Users, Wallet, AlertTriangle } from "lucide-react";

interface Budget { id: string; cliente: string; total: number; fecha: string; }
// Notá que agregamos el stock_actual
interface Material { id: string; nombre: string; categoria: string; precio_compra: number; stock_actual: number; }

const COLORES = ['#4f46e5', '#10b981', '#f472b6', '#8b5cf6', '#0ea5e9', '#f59e0b'];

export default function Estadisticas() {
    const [presupuestos, setPresupuestos] = useState<Budget[]>([]);
    const [materiales, setMateriales] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resPres, resMat] = await Promise.all([
                    fetch("/api/presupuestos"),
                    fetch("/api/materiales")
                ]);

                const dataPres = await resPres.json();
                const dataMat = await resMat.json();

                if (Array.isArray(dataPres)) setPresupuestos(dataPres);
                if (Array.isArray(dataMat)) setMateriales(dataMat);
            } catch (error) {
                console.error("Error cargando estadísticas:", error);
            } finally {
                setLoading(false);
            }
        };
        void fetchData();
    }, []);

    const totalFacturado = presupuestos.reduce((acc, curr) => acc + curr.total, 0);
    const totalPresupuestos = presupuestos.length;
    const ticketPromedio = totalPresupuestos > 0 ? totalFacturado / totalPresupuestos : 0;
    const totalMateriales = materiales.length;
    const capitalReposicion = materiales.reduce((acc, curr) => acc + (curr.precio_compra || 0), 0);

    // --- ALERTA DE STOCK NEGATIVO ---
    const materialesEnRojo = materiales.filter(m => m.stock_actual < 0);

    type IngresosAcc = Record<string, { fecha: string; total: number }>;
    const ingresosPorDia = presupuestos.reduce<IngresosAcc>((acc, curr) => {
        const fecha = new Date(curr.fecha).toLocaleDateString("es-AR", { day: '2-digit', month: 'short' });
        if (!acc[fecha]) acc[fecha] = { fecha, total: 0 };
        acc[fecha].total += curr.total;
        return acc;
    }, {});
    const datosIngresos = Object.values(ingresosPorDia).reverse();

    type CategoriaAcc = Record<string, { name: string; value: number }>;
    const matPorCategoria = materiales.reduce<CategoriaAcc>((acc, curr) => {
        const cat = curr.categoria || "Sin Categoría";
        if (!acc[cat]) acc[cat] = { name: cat, value: 0 };
        acc[cat].value += 1;
        return acc;
    }, {});
    const datosCategorias = Object.values(matPorCategoria).map((cat, index) => ({
        ...cat,
        fill: COLORES[index % COLORES.length]
    }));

    type ClientesAcc = Record<string, { nombre: string; total: number }>;
    const clientesMap = presupuestos.reduce<ClientesAcc>((acc, curr) => {
        const nom = curr.cliente.trim().toUpperCase();
        if (!acc[nom]) acc[nom] = { nombre: curr.cliente.trim(), total: 0 };
        acc[nom].total += curr.total;
        return acc;
    }, {});
    const topClientes = Object.values(clientesMap).sort((a, b) => b.total - a.total).slice(0, 5);

    if (loading) {
        return <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Calculando métricas del taller...</div>;
    }

    return (
        <div className="p-8 space-y-8 antialiased">
            <div className="flex items-center space-x-3 text-baku-deep mb-4">
                <PieChartIcon className="h-8 w-8 text-baku-purple" />
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic">Panel de Control</h1>
                    <p className="text-sm text-slate-500 font-medium">Análisis financiero y métricas del taller</p>
                </div>
            </div>

            {/* BANNER ROJO DE EMERGENCIA SI HAY STOCK NEGATIVO */}
            {materialesEnRojo.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-r-xl shadow-sm flex items-start space-x-4 animate-in slide-in-from-top-4">
                    <AlertTriangle className="text-red-500 h-8 w-8 shrink-0 mt-1" />
                    <div>
                        <h3 className="text-red-800 font-black text-lg tracking-tight uppercase">Alerta de Quiebre de Stock</h3>
                        <p className="text-red-700 text-sm mt-1">
                            Se han aprobado presupuestos que requieren insumos que actualmente no tenés en el taller. Necesitás reponer:
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {materialesEnRojo.map(m => (
                                <span key={m.id} className="bg-red-200 text-red-900 px-3 py-1 text-xs font-bold rounded-full border border-red-300">
                  {m.nombre} (Stock: {m.stock_actual.toFixed(2)})
                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* --- TARJETAS DE KPIs --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="border-none shadow-md bg-white border-l-4 border-l-green-500">
                    <CardContent className="p-5">
                        <div className="flex justify-between items-center space-x-2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Cotizado</p>
                            <DollarSign className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="mt-3 text-2xl font-black text-baku-deep">
                            ${totalFacturado.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white border-l-4 border-l-baku-pink">
                    <CardContent className="p-5">
                        <div className="flex justify-between items-center space-x-2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket Promedio</p>
                            <TrendingUp className="h-4 w-4 text-baku-pink" />
                        </div>
                        <div className="mt-3 text-2xl font-black text-baku-deep">
                            ${ticketPromedio.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white border-l-4 border-l-baku-purple">
                    <CardContent className="p-5">
                        <div className="flex justify-between items-center space-x-2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Presupuestos</p>
                            <Receipt className="h-4 w-4 text-baku-purple" />
                        </div>
                        <div className="mt-3 text-2xl font-black text-baku-deep">
                            {totalPresupuestos} <span className="text-xs text-slate-400 font-medium">emitidos</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white border-l-4 border-l-orange-500">
                    <CardContent className="p-5">
                        <div className="flex justify-between items-center space-x-2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Capital Base</p>
                            <Wallet className="h-4 w-4 text-orange-500" />
                        </div>
                        <div className="mt-3 text-2xl font-black text-baku-deep">
                            ${capitalReposicion.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white border-l-4 border-l-teal-500">
                    <CardContent className="p-5">
                        <div className="flex justify-between items-center space-x-2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Insumos</p>
                            <Package className="h-4 w-4 text-teal-500" />
                        </div>
                        <div className="mt-3 text-2xl font-black text-baku-deep">
                            {totalMateriales} <span className="text-xs text-slate-400 font-medium">activos</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- GRÁFICOS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="border-none shadow-md lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg text-baku-deep">Evolución de Cotizaciones</CardTitle>
                        <CardDescription>Dinero total presupuestado por día</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {datosIngresos.length === 0 ? (
                            <div className="h-[250px] flex items-center justify-center text-slate-400">Sin datos suficientes</div>
                        ) : (
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={datosIngresos} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                                        <Tooltip
                                            formatter={(value) => {
                                                const numValue = typeof value === 'number' ? value : Number(value);
                                                return [`$${numValue.toLocaleString("es-AR")}`, "Total"];
                                            }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Line type="monotone" dataKey="total" stroke="#3f1d85" strokeWidth={4} dot={{ r: 4, fill: '#3f1d85', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md">
                    <CardHeader>
                        <CardTitle className="text-lg text-baku-deep">Inventario</CardTitle>
                        <CardDescription>Insumos por categoría</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {datosCategorias.length === 0 ? (
                            <div className="h-[250px] flex items-center justify-center text-slate-400">Sin materiales</div>
                        ) : (
                            <div className="h-[250px] w-full flex flex-col items-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={datosCategorias} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" />
                                        <Tooltip
                                            formatter={(value) => [`${value} insumos`, "Cantidad"]}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap justify-center gap-3 mt-1">
                                    {datosCategorias.map((cat: { name: string; value: number; fill: string }, i: number) => (
                                        <div key={i} className="flex items-center text-xs text-slate-600 font-medium">
                                            <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: cat.fill }}></div>
                                            {cat.name} ({cat.value})
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="text-lg text-baku-deep flex items-center">
                            <Users className="mr-2 h-5 w-5 text-baku-pink" /> Ranking de Clientes (Top 5)
                        </CardTitle>
                        <CardDescription>Clientes que más volumen de dinero han presupuestado</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {topClientes.length === 0 ? (
                            <div className="h-[200px] flex items-center justify-center text-slate-400">Sin presupuestos emitidos</div>
                        ) : (
                            <div className="h-[200px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topClientes} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `$${val}`} />
                                        <YAxis dataKey="nombre" type="category" stroke="#475569" fontSize={12} fontWeight="bold" width={100} />
                                        <Tooltip
                                            formatter={(value) => {
                                                const numValue = typeof value === 'number' ? value : Number(value);
                                                return [`$${numValue.toLocaleString("es-AR")}`, "Volumen Cotizado"];
                                            }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="total" fill="#f472b6" radius={[0, 4, 4, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}