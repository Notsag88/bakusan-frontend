import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Cpu, Plus, Zap, Settings, DollarSign, Clock } from "lucide-react";

// --- INTERFACES ESTRICTAS ---
interface Machine {
    id: string;
    nombre: string;
    precio_compra: number;
    horas_vida_util: number;
    mantenimiento_estimado: number;
    costo_por_minuto: number; // Calculado por Go
}

export default function Maquinas() {
    const [maquinas, setMaquinas] = useState<Machine[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Estados del Formulario
    const [nombre, setNombre] = useState("");
    const [precioCompra, setPrecioCompra] = useState<number | "">("");
    const [horasVidaUtil, setHorasVidaUtil] = useState<number | "">("");
    const [mantenimientoEstimado, setMantenimientoEstimado] = useState<number | "">("");

    // --- CARGAR MÁQUINAS (GET) ---
    const fetchMaquinas = () => {
        setLoading(true);
        fetch("/api/maquinas")
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) setMaquinas(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error cargando máquinas:", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchMaquinas();
    }, []);

    // --- CREAR MÁQUINA (POST) ---
    const handleCrearMaquina = async () => {
        if (!nombre || precioCompra === "" || horasVidaUtil === "") {
            alert("Por favor completá los campos obligatorios.");
            return;
        }

        setIsSaving(true);

        // Armamos el JSON según el struct domain.Machine en Go
        const payload = {
            nombre,
            precio_compra: Number(precioCompra),
            horas_vida_util: Number(horasVidaUtil),
            mantenimiento_estimado: Number(mantenimientoEstimado || 0),
        };

        try {
            const res = await fetch("/api/maquinas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Error al guardar la máquina");

            // Refrescamos la lista, limpiamos el formulario y cerramos el modal
            fetchMaquinas();
            setNombre("");
            setPrecioCompra("");
            setHorasVidaUtil("");
            setMantenimientoEstimado("");
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Hubo un error al guardar la máquina en la base de datos.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-8 space-y-6 antialiased">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center space-x-3 text-baku-deep">
                    <Cpu className="h-8 w-8 text-baku-purple" />
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase italic">Sala de Máquinas</h1>
                        <p className="text-sm text-slate-500 font-medium">Gestión de desgaste y amortización de herramientas</p>
                    </div>
                </div>

                {/* BOTÓN NUEVA MÁQUINA + MODAL */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-baku-purple hover:bg-baku-deep text-white shadow-lg transition-transform active:scale-95">
                            <Plus className="mr-2 h-4 w-4" /> Agregar Máquina
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center text-baku-deep">
                                <Settings className="mr-2 h-5 w-5 text-baku-pink" />
                                Registrar Nueva Máquina
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Nombre / Modelo</Label>
                                <Input
                                    placeholder="Ej: Láser Acmer S2 33W"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    className="focus-visible:ring-baku-purple"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Precio Compra (US$ o AR$)</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            type="number"
                                            className="pl-9 focus-visible:ring-baku-purple"
                                            value={precioCompra}
                                            onChange={(e) => setPrecioCompra(Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Mantenimiento Vida Útil</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            type="number"
                                            className="pl-9 focus-visible:ring-baku-purple"
                                            value={mantenimientoEstimado}
                                            onChange={(e) => setMantenimientoEstimado(Number(e.target.value))}
                                            title="Gasto estimado en repuestos durante su vida útil"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 col-span-2 border-t border-slate-100 pt-2">
                                    <Label>Horas de Vida Útil Estimada</Label>
                                    <div className="relative">
                                        <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            type="number"
                                            className="pl-9 focus-visible:ring-baku-purple"
                                            value={horasVidaUtil}
                                            onChange={(e) => setHorasVidaUtil(Number(e.target.value))}
                                            placeholder="Ej: 10000"
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        💡 <strong className="text-baku-purple">Tip:</strong> Láser de diodo = ~10.000 hs. Impresora EcoTank = ~1.000 hs (30k copias).
                                    </p>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleCrearMaquina} disabled={isSaving} className="bg-baku-deep text-white">
                                {isSaving ? "Guardando..." : "Guardar Máquina"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* TABLA DE MÁQUINAS */}
            <Card className="border-none shadow-md bg-white/90">
                <CardHeader className="border-b border-baku-mint/30 pb-4">
                    <CardTitle className="text-xl text-baku-deep flex items-center">
                        <Zap className="mr-2 h-5 w-5 text-yellow-500" />
                        Parque Automotor
                    </CardTitle>
                    <CardDescription>Costo de amortización calculado automáticamente por servidor</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400 animate-pulse">Cargando maquinaria...</div>
                    ) : maquinas.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center space-y-3">
                            <Settings className="h-12 w-12 text-slate-200" />
                            <p className="text-slate-500">Todavía no tenés máquinas cargadas.</p>
                            <Button variant="outline" onClick={() => setIsModalOpen(true)} className="text-baku-purple border-baku-purple/30">
                                Agregar mi primera máquina
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="font-bold text-slate-600">Máquina</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-right">Precio</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-right">Mantenimiento</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-right">Vida Útil</TableHead>
                                    <TableHead className="font-bold text-baku-purple text-right bg-baku-purple/5">Costo x Minuto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {maquinas.map((maq) => (
                                    <TableRow key={maq.id} className="hover:bg-baku-mint/5 transition-colors">
                                        <TableCell className="font-medium text-baku-deep">{maq.nombre}</TableCell>
                                        <TableCell className="text-right text-slate-600">${maq.precio_compra.toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-slate-600">${maq.mantenimiento_estimado.toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-slate-600">{maq.horas_vida_util.toLocaleString()} hs</TableCell>
                                        <TableCell className="text-right font-black text-orange-600 bg-baku-purple/5">
                                            ${maq.costo_por_minuto.toFixed(2)}
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