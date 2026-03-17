import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// 1. ELIMINAMOS 'Cell' DE LA IMPORTACIÓN
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Package, DollarSign, Layers, Activity } from "lucide-react";

// --- INTERFACES ESTRICTAS DE TYPESCRIPT ---
interface Material {
    id: string;
    nombre: string;
    categoria: string;
    precio_compra: number;
}

interface CategoriaCount {
    name: string;
    value: number;
    fill?: string; // Agregamos la propiedad del color
}

interface CategoriaInversion {
    name: string;
    inversion: number;
    fill?: string; // Agregamos la propiedad del color
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
}

const COLORES = ["#392071", "#AE92C4", "#DBACD0", "#CFE8E5", "#6B4C9A"];

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-100">
                <p className="font-bold text-baku-deep">{label}</p>
                <p className="text-baku-purple">
                    Inversión: ${Number(payload[0].value).toLocaleString()}
                </p>
            </div>
        );
    }
    return null;
};

export default function Home() {
    const [materiales, setMateriales] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        fetch("/api/materiales")
            .then((res) => res.json())
            .then((data) => {
                if (isMounted) {
                    setMateriales(data);
                    setLoading(false);
                }
            })
            .catch((err) => {
                console.error("Error cargando dashboard:", err);
                if (isMounted) setLoading(false);
            });
        return () => { isMounted = false; };
    }, []);

    const inversionTotal = materiales.reduce((acc, m) => acc + m.precio_compra, 0);

    // 2. INYECTAMOS EL COLOR DIRECTAMENTE EN LOS DATOS (.map al final)
    const distribucionCategorias = materiales.reduce<CategoriaCount[]>((acc, m) => {
        const cat = m.categoria.toUpperCase();
        const existente = acc.find((item) => item.name === cat);
        if (existente) {
            existente.value += 1;
        } else {
            acc.push({ name: cat, value: 1 });
        }
        return acc;
    }, []).map((item, index) => ({
        ...item,
        fill: COLORES[index % COLORES.length] // Recharts lee esto automáticamente
    }));

    const inversionPorCategoria = materiales.reduce<CategoriaInversion[]>((acc, m) => {
        const cat = m.categoria.toUpperCase();
        const existente = acc.find((item) => item.name === cat);
        if (existente) {
            existente.inversion += m.precio_compra;
        } else {
            acc.push({ name: cat, inversion: m.precio_compra });
        }
        return acc;
    }, []).map((item, index) => ({
        ...item,
        fill: COLORES[index % COLORES.length] // Recharts lee esto automáticamente
    }));

    return (
        <div className="p-8 space-y-8 antialiased">

            <div className="flex items-center space-x-3 text-baku-deep mb-4">
                <Activity className="h-8 w-8 text-baku-purple" />
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic">Panel de Control</h1>
                    <p className="text-sm text-slate-500 font-medium">Resumen financiero y métricas de Baku-San</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-none shadow-md bg-white/90">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold text-slate-500 uppercase">Inversión Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-baku-deep" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <div className="h-8 w-24 bg-slate-100 animate-pulse rounded"></div> : (
                            <div className="text-3xl font-black text-baku-deep">${inversionTotal.toLocaleString()}</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white/90">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold text-slate-500 uppercase">Total Insumos</CardTitle>
                        <Package className="h-4 w-4 text-baku-purple" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <div className="h-8 w-12 bg-slate-100 animate-pulse rounded"></div> : (
                            <div className="text-3xl font-black text-baku-deep">{materiales.length}</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white/90">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold text-slate-500 uppercase">Categorías Activas</CardTitle>
                        <Layers className="h-4 w-4 text-baku-pink" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <div className="h-8 w-12 bg-slate-100 animate-pulse rounded"></div> : (
                            <div className="text-3xl font-black text-baku-deep">{distribucionCategorias.length}</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white/90">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold text-slate-500 uppercase">Estado Sistema</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-green-600 flex items-center">
              <span className="relative flex h-3 w-3 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
                            Online
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">

                <Card className="border-none shadow-md bg-white/90">
                    <CardHeader>
                        <CardTitle className="text-lg text-baku-deep">Distribución de Inventario</CardTitle>
                        <CardDescription>Cantidad de insumos por categoría</CardDescription>
                    </CardHeader>
                    <CardContent className="h-75 flex items-center justify-center">
                        {loading || materiales.length === 0 ? (
                            <p className="text-slate-400">No hay datos suficientes</p>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    {/* 3. AHORA <Pie> ES UNA ETIQUETA QUE SE CIERRA A SÍ MISMA */}
                                    <Pie
                                        data={distribucionCategorias}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }: { name?: string; percent?: number }) =>
                                            `${name || 'Otro'} ${percent !== undefined ? (percent * 100).toFixed(0) : 0}%`
                                        }
                                        labelLine={false}
                                    />
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white/90">
                    <CardHeader>
                        <CardTitle className="text-lg text-baku-deep">Capital Invertido</CardTitle>
                        <CardDescription>Dinero en stock agrupado por familia de material</CardDescription>
                    </CardHeader>
                    <CardContent className="h-75">
                        {loading || materiales.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-slate-400">No hay datos suficientes</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={inversionPorCategoria} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(value) => `$${value}`}
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#CFE8E5', opacity: 0.2 }} />
                                    {/* 3. AHORA <Bar> ES UNA ETIQUETA QUE SE CIERRA A SÍ MISMA */}
                                    <Bar dataKey="inversion" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}