import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, Search, Receipt, Calendar, User, FileText, CheckCircle } from "lucide-react";

interface Budget { id: string; cliente: string; referencia: string; total: number; fecha: string; estado: string; creador: string; }

export default function Historial() {
    const [presupuestos, setPresupuestos] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetch("/api/presupuestos")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setPresupuestos(data);
                setLoading(false);
            }).catch(err => { console.error(err); setLoading(false); });
    }, []);

    const handleAprobar = async (id: string) => {
        const confirmacion = window.confirm(
            "¿Aprobar este presupuesto?\n\n⚠️ Atención: El sistema descontará los insumos de tu stock automáticamente. Si usaste materiales que no tenés cargados, el stock quedará en negativo (en rojo)."
        );
        if (!confirmacion) return;

        try {
            const res = await fetch(`/api/presupuestos/${id}/aprobar`, { method: "POST" });
            if (!res.ok) throw new Error("Error al aprobar");

            setPresupuestos(presupuestos.map(p => p.id === id ? { ...p, estado: "Aprobado" } : p));
            alert("¡Presupuesto Aprobado! Insumos descontados del taller.");
        } catch (error) {
            alert("Hubo un error al intentar aprobar el presupuesto.");
        }
    };

    const filtered = presupuestos.filter(p =>
        p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.referencia && p.referencia.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const formatearFecha = (fechaIso: string) => {
        return new Date(fechaIso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="p-8 space-y-6 antialiased">
            <div className="flex items-center space-x-3 text-baku-deep mb-8">
                <History className="h-8 w-8 text-baku-purple" />
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic">Historial</h1>
                    <p className="text-sm text-slate-500 font-medium">Registro de presupuestos emitidos</p>
                </div>
            </div>

            <Card className="border-none shadow-md bg-white/90">
                <CardHeader className="border-b border-baku-mint/30 pb-4">
                    <CardTitle className="text-xl text-baku-deep flex items-center">
                        <Receipt className="mr-2 h-5 w-5 text-baku-pink" /> Presupuestos Guardados
                    </CardTitle>
                    <CardDescription>Buscá por nombre o aprobá los trabajos confirmados para descontar stock.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-4 border-b border-slate-100 flex items-center bg-slate-50/50">
                        <Search className="h-5 w-5 text-slate-400 mr-2" />
                        <Input placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-md bg-white focus-visible:ring-baku-purple" />
                    </div>

                    {loading ? (
                        <div className="p-12 text-center animate-pulse">Cargando...</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 font-bold">No hay presupuestos.</div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-white">
                                <TableRow>
                                    <TableHead><Calendar className="inline h-4 w-4 mr-1"/> Fecha</TableHead>
                                    <TableHead><User className="inline h-4 w-4 mr-1"/> Cliente</TableHead>
                                    <TableHead><FileText className="inline h-4 w-4 mr-1"/> Referencia</TableHead>
                                    <TableHead>Creador</TableHead> {/* <-- NUEVA COLUMNA */}
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="text-sm text-slate-500">{formatearFecha(p.fecha)}</TableCell>
                                        <TableCell className="font-bold text-baku-deep">{p.cliente}</TableCell>
                                        <TableCell className="text-sm text-slate-600 truncate max-w-[200px]">{p.referencia || "Sin notas"}</TableCell>
                                        <TableCell className="text-xs text-slate-400 font-medium">{p.creador || "Desconocido"}</TableCell> {/* <-- NUEVO DATO */}
                                        <TableCell>
                                            {p.estado === 'Aprobado' ? (
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200">APROBADO</span>
                                            ) : (
                                                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold border border-orange-200">PENDIENTE</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-black text-baku-purple">${p.total.toLocaleString("es-AR")}</TableCell>
                                        <TableCell className="text-right">
                                            {p.estado !== 'Aprobado' && (
                                                <Button onClick={() => handleAprobar(p.id)} size="sm" className="bg-baku-deep hover:bg-baku-purple text-white">
                                                    <CheckCircle className="mr-1 h-4 w-4" /> Aprobar
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}