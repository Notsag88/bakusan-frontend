import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Pencil, Trash2, Search, PackagePlus, AlertCircle } from "lucide-react";

interface Material {
    id: string;
    nombre: string;
    categoria_id: string;
    categoria: string;
    tipo_unidad: string;
    precio_compra: number;
    cantidad_por_compra: number;
    stock_actual: number; // <-- NUEVO: Para leer el stock
}

interface Categoria {
    id: string;
    nombre: string;
}

export default function Materiales() {
    const [materiales, setMateriales] = useState<Material[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);

    // Estados del Modal Crear/Editar
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Estados del Formulario Crear/Editar
    const [nombre, setNombre] = useState("");
    const [categoriaId, setCategoriaId] = useState("");
    const [tipoUnidad, setTipoUnidad] = useState("unidad");
    const [precioCompra, setPrecioCompra] = useState<number | "">("");
    const [cantidadPorCompra, setCantidadPorCompra] = useState<number | "">("");
    const [stockActual, setStockActual] = useState<number | "">(""); // Para cuando creas de cero

    // --- NUEVO: ESTADOS DEL MODAL DE INGRESO DE STOCK ---
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [stockMaterial, setStockMaterial] = useState<Material | null>(null);
    const [cantidadASumar, setCantidadASumar] = useState<number | "">("");
    const [isUpdatingStock, setIsUpdatingStock] = useState(false);

    // Búsqueda
    const [searchTerm, setSearchTerm] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resMat, resCat] = await Promise.all([
                fetch("/api/materiales"),
                fetch("/api/categorias")
            ]);
            const dataMat = await resMat.json();
            const dataCat = await resCat.json();

            if (Array.isArray(dataMat)) setMateriales(dataMat);
            if (Array.isArray(dataCat)) setCategorias(dataCat);
        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openCreateModal = () => {
        setEditingId(null);
        setNombre("");
        setCategoriaId("");
        setTipoUnidad("unidad");
        setPrecioCompra("");
        setCantidadPorCompra("");
        setStockActual("");
        setIsModalOpen(true);
    };

    const openEditModal = (mat: Material) => {
        setEditingId(mat.id);
        setNombre(mat.nombre);
        setCategoriaId(mat.categoria_id);
        setTipoUnidad(mat.tipo_unidad);
        setPrecioCompra(mat.precio_compra);
        setCantidadPorCompra(mat.cantidad_por_compra);
        setStockActual(mat.stock_actual);
        setIsModalOpen(true);
    };

    // --- NUEVO: ABRIR MODAL DE STOCK ---
    const openStockModal = (mat: Material) => {
        setStockMaterial(mat);
        setCantidadASumar("");
        setIsStockModalOpen(true);
    };

    const handleGuardar = async () => {
        if (!nombre || precioCompra === "" || cantidadPorCompra === "" || !categoriaId) {
            alert("Completá todos los campos, incluyendo la categoría.");
            return;
        }

        setIsSaving(true);
        const payload = {
            nombre,
            categoria_id: categoriaId,
            tipo_unidad: tipoUnidad,
            precio_compra: Number(precioCompra),
            cantidad_por_compra: Number(cantidadPorCompra),
            stock_actual: Number(stockActual) || 0
        };

        try {
            const url = editingId ? `/api/materiales/${editingId}` : "/api/materiales";
            const method = editingId ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Error al guardar");

            await fetchData();
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Hubo un error al guardar el insumo.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- NUEVO: FUNCIÓN PARA SUMAR STOCK ---
    const handleSumarStock = async () => {
        if (!stockMaterial || cantidadASumar === "" || Number(cantidadASumar) <= 0) {
            alert("Ingresá una cantidad válida para sumar.");
            return;
        }

        setIsUpdatingStock(true);

        // Calculamos el nuevo total
        const nuevoStockTotal = stockMaterial.stock_actual + Number(cantidadASumar);

        const payload = {
            nombre: stockMaterial.nombre,
            categoria_id: stockMaterial.categoria_id,
            tipo_unidad: stockMaterial.tipo_unidad,
            precio_compra: stockMaterial.precio_compra,
            cantidad_por_compra: stockMaterial.cantidad_por_compra,
            stock_actual: nuevoStockTotal // Le mandamos a Go el stock actualizado
        };

        try {
            const res = await fetch(`/api/materiales/${stockMaterial.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Error al actualizar stock");

            alert(`¡Ingreso registrado! El nuevo stock de ${stockMaterial.nombre} es ${nuevoStockTotal}.`);
            await fetchData();
            setIsStockModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Hubo un error al intentar actualizar el stock.");
        } finally {
            setIsUpdatingStock(false);
        }
    };

    const handleBorrar = async (id: string) => {
        if (!confirm("¿Estás seguro de que querés borrar este insumo?")) return;

        try {
            const res = await fetch(`/api/materiales/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Error al borrar");
            await fetchData();
        } catch (error) {
            console.error(error);
            alert("Hubo un error al eliminar el insumo.");
        }
    };

    const filteredMateriales = materiales.filter(m =>
        m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 space-y-6 antialiased">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center space-x-3 text-baku-deep">
                    <Package className="h-8 w-8 text-baku-purple" />
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase italic">Inventario</h1>
                        <p className="text-sm text-slate-500 font-medium">Gestión de insumos, costos y stock físico</p>
                    </div>
                </div>

                <Button onClick={openCreateModal} className="bg-baku-purple hover:bg-baku-deep text-white shadow-lg transition-transform active:scale-95">
                    <Plus className="mr-2 h-4 w-4" /> Agregar Insumo
                </Button>
            </div>

            <Card className="border-none shadow-md bg-white/90">
                <CardHeader className="border-b border-baku-mint/30 pb-4 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl text-baku-deep">Listado de Materiales</CardTitle>
                        <CardDescription>Catálogo de precios y existencias en el taller</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-4 border-b border-slate-100 flex items-center">
                        <Search className="h-5 w-5 text-slate-400 mr-2" />
                        <Input
                            placeholder="Buscar por nombre o categoría..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="max-w-md border-slate-200 focus-visible:ring-baku-purple bg-white"
                        />
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-400 animate-pulse font-medium">Cargando inventario...</div>
                    ) : filteredMateriales.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center space-y-3">
                            <Package className="h-12 w-12 text-slate-200" />
                            <p className="text-slate-500 font-medium">No se encontraron insumos.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="font-bold text-slate-600">Nombre</TableHead>
                                    <TableHead className="font-bold text-slate-600">Categoría</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-right">Precio</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-center">Rendimiento</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-center">Stock Actual</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMateriales.map((mat) => (
                                    <TableRow key={mat.id} className="hover:bg-baku-mint/5 transition-colors">
                                        <TableCell className="font-bold text-baku-deep">{mat.nombre}</TableCell>
                                        <TableCell><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-semibold">{mat.categoria}</span></TableCell>
                                        <TableCell className="text-right font-medium text-slate-600">${mat.precio_compra.toLocaleString("es-AR")}</TableCell>
                                        <TableCell className="text-center text-xs text-slate-500 font-medium tracking-wide uppercase">Trae {mat.cantidad_por_compra} {mat.tipo_unidad}s</TableCell>

                                        {/* COLUMNA DE STOCK DINÁMICO */}
                                        <TableCell className="text-center">
                                            {mat.stock_actual < 0 ? (
                                                <span className="flex items-center justify-center text-red-600 font-black bg-red-100 px-2 py-1 rounded-full text-sm">
                                                    <AlertCircle className="w-4 h-4 mr-1" /> {mat.stock_actual.toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="font-bold text-slate-700">{mat.stock_actual.toFixed(2)}</span>
                                            )}
                                        </TableCell>

                                        <TableCell className="text-right space-x-1">
                                            {/* BOTÓN DE INGRESO DE STOCK */}
                                            <Button variant="outline" size="sm" onClick={() => openStockModal(mat)} className="border-green-200 text-green-700 hover:bg-green-50 mr-2">
                                                <PackagePlus className="h-4 w-4 mr-1" /> Ingreso
                                            </Button>

                                            <Button variant="ghost" size="icon" onClick={() => openEditModal(mat)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleBorrar(mat.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
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
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-baku-deep">
                            {editingId ? "Editar Insumo" : "Nuevo Insumo"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Nombre del Material</Label>
                            <Input placeholder="Ej: Resma Papel A4" value={nombre} onChange={e => setNombre(e.target.value)} className="focus-visible:ring-baku-purple" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Categoría</Label>
                                <Select value={categoriaId} onValueChange={setCategoriaId}>
                                    <SelectTrigger className="focus:ring-baku-purple"><SelectValue placeholder="Elegir..." /></SelectTrigger>
                                    <SelectContent position="popper" sideOffset={4}>
                                        {categorias.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo de Unidad</Label>
                                <Select value={tipoUnidad} onValueChange={setTipoUnidad}>
                                    <SelectTrigger className="focus:ring-baku-purple"><SelectValue /></SelectTrigger>
                                    <SelectContent position="popper" sideOffset={4}>
                                        <SelectItem value="unidad">Unidades</SelectItem>
                                        <SelectItem value="plancha">Planchas</SelectItem>
                                        <SelectItem value="litro">Litros/ml</SelectItem>
                                        <SelectItem value="kg">Kilos/gr</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                            <div className="space-y-2">
                                <Label className="text-baku-purple font-bold">Precio Pagado ($)</Label>
                                <Input type="number" value={precioCompra} onChange={e => setPrecioCompra(Number(e.target.value))} className="focus-visible:ring-baku-purple bg-baku-purple/5 border-baku-purple/30" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-baku-pink font-bold">Rendimiento (Trae...)</Label>
                                <Input type="number" value={cantidadPorCompra} onChange={e => setCantidadPorCompra(Number(e.target.value))} className="focus-visible:ring-baku-pink bg-baku-pink/5 border-baku-pink/30" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleGuardar} disabled={isSaving} className="bg-baku-deep text-white">
                            {isSaving ? "Guardando..." : "Guardar Insumo"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- NUEVO: MODAL INGRESO DE STOCK --- */}
            <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="text-baku-deep flex items-center">
                            <PackagePlus className="mr-2 h-5 w-5 text-green-600" />
                            Ingreso de Mercadería
                        </DialogTitle>
                        <DialogDescription>
                            Registrá la cantidad que compraste para sumarla al stock físico del taller.
                        </DialogDescription>
                    </DialogHeader>

                    {stockMaterial && (
                        <div className="py-4 space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Insumo Seleccionado</p>
                                <p className="text-lg font-black text-baku-deep">{stockMaterial.nombre}</p>
                                <div className="flex justify-between mt-2 text-sm">
                                    <span className="text-slate-500">Stock Actual:</span>
                                    <span className="font-bold text-slate-700">{stockMaterial.stock_actual.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-green-700 font-bold">Cantidad a Sumar</Label>
                                <div className="flex items-center space-x-2">
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="Ej: 50"
                                        value={cantidadASumar}
                                        onChange={e => setCantidadASumar(Number(e.target.value))}
                                        className="focus-visible:ring-green-500 border-green-200 text-lg font-bold"
                                    />
                                    <span className="text-slate-500 font-medium">unidades</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsStockModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSumarStock} disabled={isUpdatingStock} className="bg-green-600 hover:bg-green-700 text-white">
                            {isUpdatingStock ? "Procesando..." : "Confirmar Ingreso"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}