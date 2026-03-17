import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Tags, Plus, Pencil, Trash2, Search } from "lucide-react";

interface Categoria {
    id: string;
    nombre: string;
    descripcion: string;
}

export default function Categorias() {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);

    // Estados del Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Estados del Formulario
    const [nombre, setNombre] = useState("");
    const [descripcion, setDescripcion] = useState("");

    // Búsqueda
    const [searchTerm, setSearchTerm] = useState("");

    const fetchCategorias = () => {
        setLoading(true);
        fetch("/api/categorias")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setCategorias(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchCategorias();
    }, []);

    const openCreateModal = () => {
        setEditingId(null);
        setNombre("");
        setDescripcion("");
        setIsModalOpen(true);
    };

    const openEditModal = (cat: Categoria) => {
        setEditingId(cat.id);
        setNombre(cat.nombre);
        setDescripcion(cat.descripcion || "");
        setIsModalOpen(true);
    };

    const handleGuardar = async () => {
        if (!nombre) {
            alert("El nombre de la categoría es obligatorio.");
            return;
        }

        setIsSaving(true);
        const payload = { nombre, descripcion };

        try {
            const url = editingId ? `/api/categorias/${editingId}` : "/api/categorias";
            const method = editingId ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Error al guardar");

            fetchCategorias();
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Hubo un error al guardar la categoría.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBorrar = async (id: string) => {
        if (!confirm("¿Estás seguro de que querés borrar esta categoría? Ojo, asegurate de que no haya insumos usándola.")) return;

        try {
            const res = await fetch(`/api/categorias/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Error al borrar");
            fetchCategorias();
        } catch (error) {
            console.error(error);
            alert("Hubo un error al eliminar la categoría.");
        }
    };

    const filteredCategorias = categorias.filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 space-y-6 antialiased">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center space-x-3 text-baku-deep">
                    <Tags className="h-8 w-8 text-baku-purple" />
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase italic">Categorías</h1>
                        <p className="text-sm text-slate-500 font-medium">Clasificación oficial de inventario</p>
                    </div>
                </div>

                <Button onClick={openCreateModal} className="bg-baku-purple hover:bg-baku-deep text-white shadow-lg transition-transform active:scale-95">
                    <Plus className="mr-2 h-4 w-4" /> Nueva Categoría
                </Button>
            </div>

            <Card className="border-none shadow-md bg-white/90">
                <CardHeader className="border-b border-baku-mint/30 pb-4 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl text-baku-deep">Familias de Insumos</CardTitle>
                        <CardDescription>Mantené tu base de datos y gráficos ordenados</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-4 border-b border-slate-100 flex items-center">
                        <Search className="h-5 w-5 text-slate-400 mr-2" />
                        <Input
                            placeholder="Buscar categoría..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="max-w-md border-slate-200 focus-visible:ring-baku-purple"
                        />
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-400 animate-pulse">Cargando categorías...</div>
                    ) : filteredCategorias.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center space-y-3">
                            <Tags className="h-12 w-12 text-slate-200" />
                            <p className="text-slate-500">No se encontraron categorías.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="font-bold text-slate-600">Nombre Oficial</TableHead>
                                    <TableHead className="font-bold text-slate-600">Descripción</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCategorias.map((cat) => (
                                    <TableRow key={cat.id} className="hover:bg-baku-mint/5 transition-colors">
                                        <TableCell className="font-bold text-baku-purple">{cat.nombre}</TableCell>
                                        <TableCell className="text-slate-600">{cat.descripcion || "-"}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openEditModal(cat)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 mr-2">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleBorrar(cat.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* MODAL CREAR / EDITAR */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-baku-deep">
                            {editingId ? "Editar Categoría" : "Nueva Categoría"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Nombre de la Categoría</Label>
                            <Input placeholder="Ej: Maderas" value={nombre} onChange={e => setNombre(e.target.value)} className="focus-visible:ring-baku-purple" />
                        </div>
                        <div className="space-y-2">
                            <Label>Descripción (Opcional)</Label>
                            <Input placeholder="Ej: Planchas de MDF, pino, fibrofácil..." value={descripcion} onChange={e => setDescripcion(e.target.value)} className="focus-visible:ring-baku-purple" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleGuardar} disabled={isSaving} className="bg-baku-deep text-white">
                            {isSaving ? "Guardando..." : "Guardar Categoría"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}