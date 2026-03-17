import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
    Calculator, Receipt, Zap, Package, TrendingUp, Cpu, Scissors,
    Plus, Trash2, ShoppingCart, ListChecks, FileDown, Save, BookmarkPlus, BookOpen, Send
} from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/lib/supabase";

interface Material { id: string; nombre: string; precio_compra: number; cantidad_por_compra: number; tipo_unidad: string; }
interface MachineResponse { id: string; nombre: string; costo_por_minuto: number; }
interface ProductRecipe { id: string; nombre: string; sku: string; margen_ganancia_esperado: number; costo_operativo_taller: number; costo_total_produccion: number; ganancia_neta: number; precio_venta_sugerido: number; }
interface YieldResponse { total_piezas: number; costo_por_pieza: number; porcentaje_desperdicio: number; }
interface RecipeMaterialRow { uniqueId: string; materialId: string; modo: "rendimiento" | "cantidad"; valor: number; }
interface RecipeMachineRow { uniqueId: string; machineId: string; minutos: number; }
interface CartItem { id: string; producto: ProductRecipe; cantidadCliente: number; receta?: any[]; }

export default function Cotizador() {
    const [materiales, setMateriales] = useState<Material[]>([]);
    const [maquinas, setMaquinas] = useState<MachineResponse[]>([]);
    const [catalogo, setCatalogo] = useState<any[]>([]); // NUEVO: Estado para el catálogo

    const [productoActual, setProductoActual] = useState<ProductRecipe | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [isSavingCatalogo, setIsSavingCatalogo] = useState(false);

    const [cart, setCart] = useState<CartItem[]>([]);
    const [cantidadAAgregar, setCantidadAAgregar] = useState<number>(1);

    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [cliente, setCliente] = useState("");
    const [referencia, setReferencia] = useState("");
    const [isSavingBudget, setIsSavingBudget] = useState(false);

    const [nombreProducto, setNombreProducto] = useState("");
    const [skuProducto, setSkuProducto] = useState("");
    const [margenGanancia, setMargenGanancia] = useState<number>(150);
    const [listaMateriales, setListaMateriales] = useState<RecipeMaterialRow[]>([{ uniqueId: Date.now().toString(), materialId: "", modo: "rendimiento", valor: 1 }]);
    const [listaMaquinas, setListaMaquinas] = useState<RecipeMachineRow[]>([{ uniqueId: (Date.now() + 1).toString(), machineId: "", minutos: 0 }]);

    const [openModalCortes, setOpenModalCortes] = useState(false);
    const [activeYieldRow, setActiveYieldRow] = useState<string | null>(null);
    const [cortePlanchaW, setCortePlanchaW] = useState<number>(600);
    const [cortePlanchaL, setCortePlanchaL] = useState<number>(400);
    const [cortePiezaW, setCortePiezaW] = useState<number>(50);
    const [cortePiezaL, setCortePiezaL] = useState<number>(50);
    const [corteMargen, setCorteMargen] = useState<number>(2);
    const [corteResultado, setCorteResultado] = useState<YieldResponse | null>(null);
    const [isCorteLoading, setIsCorteLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        // Agregamos la carga del catálogo al iniciar
        Promise.all([
            fetch("/api/materiales").then(res => res.json()),
            fetch("/api/maquinas").then(res => res.json()),
            fetch("/api/catalogo").then(res => res.json())
        ]).then(([dataMat, dataMaq, dataCat]) => {
            if (!isMounted) return;
            if (Array.isArray(dataMat)) setMateriales(dataMat);
            if (Array.isArray(dataMaq)) setMaquinas(dataMaq);
            if (Array.isArray(dataCat)) setCatalogo(dataCat);
        }).catch(console.error);

        return () => { isMounted = false; };
    }, []);

    // --- NUEVA FUNCIÓN: CARGAR DATOS DEL CATÁLOGO ---
    const handleCargarDesdeCatalogo = (catalogoId: string) => {
        if (catalogoId === "none") {
            // Limpiar formulario si selecciona "Crear Nuevo"
            setNombreProducto("");
            setSkuProducto("");
            setListaMateriales([{ uniqueId: Date.now().toString(), materialId: "", modo: "rendimiento", valor: 1 }]);
            setListaMaquinas([{ uniqueId: (Date.now() + 1).toString(), machineId: "", minutos: 0 }]);
            return;
        }

        const item = catalogo.find(c => c.id === catalogoId);
        if (!item) return;

        setNombreProducto(item.nombre);
        setSkuProducto(item.sku || "");
        setMargenGanancia(item.margen_ganancia_esperado);

        // Reconstruimos las filas de materiales (siempre en modo "cantidad" exacta porque así se guardan)
        if (item.materiales && item.materiales.length > 0) {
            setListaMateriales(item.materiales.map((m: any, idx: number) => ({
                uniqueId: `cat-mat-${idx}-${Date.now()}`,
                materialId: m.id,
                modo: "cantidad",
                valor: m.cantidad
            })));
        } else {
            setListaMateriales([{ uniqueId: Date.now().toString(), materialId: "", modo: "rendimiento", valor: 1 }]);
        }

        // Reconstruimos las filas de máquinas
        if (item.maquinas && item.maquinas.length > 0) {
            setListaMaquinas(item.maquinas.map((m: any, idx: number) => ({
                uniqueId: `cat-maq-${idx}-${Date.now()}`,
                machineId: m.id,
                minutos: m.cantidad
            })));
        } else {
            setListaMaquinas([{ uniqueId: (Date.now() + 1).toString(), machineId: "", minutos: 0 }]);
        }
    };

    const addMaterialRow = () => setListaMateriales([...listaMateriales, { uniqueId: Date.now().toString(), materialId: "", modo: "rendimiento", valor: 1 }]);
    const removeMaterialRow = (id: string) => setListaMateriales(listaMateriales.filter(row => row.uniqueId !== id));
    const updateMaterialRow = (id: string, field: keyof RecipeMaterialRow, value: string | number) => {
        setListaMateriales(listaMateriales.map(row => row.uniqueId === id ? { ...row, [field]: value } : row));
    };
    const addMachineRow = () => setListaMaquinas([...listaMaquinas, { uniqueId: Date.now().toString(), machineId: "", minutos: 0 }]);
    const removeMachineRow = (id: string) => setListaMaquinas(listaMaquinas.filter(row => row.uniqueId !== id));
    const updateMachineRow = (id: string, field: keyof RecipeMachineRow, value: string | number) => {
        setListaMaquinas(listaMaquinas.map(row => row.uniqueId === id ? { ...row, [field]: value } : row));
    };

    const openYieldAssistant = (rowId: string) => { setActiveYieldRow(rowId); setCorteResultado(null); setOpenModalCortes(true); };

    const handleCalcularRendimiento = async () => {
        setIsCorteLoading(true);
        const row = listaMateriales.find(r => r.uniqueId === activeYieldRow);
        const matObj = materiales.find(m => m.id === row?.materialId);
        const costoPlancha = matObj ? matObj.precio_compra : 0;
        const payload = { ancho_plancha: cortePlanchaW, largo_plancha: cortePlanchaL, costo_plancha: costoPlancha, ancho_pieza: cortePiezaW, largo_pieza: cortePiezaL, margen_corte: corteMargen };
        try {
            const res = await fetch("/api/calcular-corte", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error("Error en motor de cortes");
            const data = await res.json();
            setCorteResultado(data);
        } catch (error) { console.error(error); alert("Error calculando el corte."); } finally { setIsCorteLoading(false); }
    };

    const aplicarCorte = () => {
        if (corteResultado && activeYieldRow) {
            updateMaterialRow(activeYieldRow, "valor", corteResultado.total_piezas);
            setOpenModalCortes(false);
        }
    };

    const handleCalcularCostoBase = async () => {
        if (!nombreProducto) { alert("Ingresá el nombre del producto."); return; }
        const materialesValidos = listaMateriales.filter(m => m.materialId !== "");
        const maquinasValidas = listaMaquinas.filter(m => m.machineId !== "");
        if (materialesValidos.length === 0 || maquinasValidas.length === 0) { alert("Agregá al menos 1 material y 1 máquina."); return; }

        setIsCalculating(true);
        const payloadMaterials = materialesValidos.map(m => {
            let cant: number;
            if (m.modo === "rendimiento") cant = m.valor > 0 ? 1 / m.valor : 1;
            else cant = m.valor;
            return { id: m.materialId, cantidad: cant };
        });
        const payloadMachines = maquinasValidas.map(m => ({ id: m.machineId, cantidad: m.minutos }));
        const payload = {
            nombre: nombreProducto, sku: skuProducto || `SKU-${Math.floor(Math.random() * 10000)}`,
            margen_ganancia_esperado: margenGanancia, materiales: payloadMaterials, maquinas: payloadMachines
        };

        try {
            const res = await fetch("/api/productos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error("Error en servidor");
            const data: ProductRecipe = await res.json();
            setProductoActual(data);
            setCantidadAAgregar(1);
        } catch (error) { console.error(error); alert("Problema de conexión."); } finally { setIsCalculating(false); }
    };

    const handleGuardarCatalogo = async () => {
        if (!productoActual) return;
        setIsSavingCatalogo(true);

        const payloadMaterials = listaMateriales.filter(m => m.materialId !== "").map(m => {
            let cant = m.modo === "rendimiento" ? (m.valor > 0 ? 1 / m.valor : 1) : m.valor;
            return { id: m.materialId, cantidad: cant };
        });
        const payloadMachines = listaMaquinas.filter(m => m.machineId !== "").map(m => ({ id: m.machineId, cantidad: m.minutos }));

        const payload = {
            nombre: productoActual.nombre,
            sku: productoActual.sku,
            margen_ganancia_esperado: margenGanancia,
            materiales: payloadMaterials,
            maquinas: payloadMachines
        };

        try {
            const res = await fetch("/api/catalogo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Error al guardar en catálogo");

            // Actualizamos la lista de catálogo para poder seleccionarlo enseguida
            const data = await res.json();
            setCatalogo(prev => [...prev, data]);
            alert("¡Producto guardado en el Catálogo exitosamente!");
        } catch (error) {
            console.error(error);
            alert("Hubo un error al guardar en el catálogo.");
        } finally {
            setIsSavingCatalogo(false);
        }
    };

    const agregarAlPresupuesto = () => {
        if (productoActual && cantidadAAgregar > 0) {
            const recetaDelProducto = listaMateriales
                .filter(m => m.materialId !== "")
                .map(m => {
                    const matDb = materiales.find(x => x.id === m.materialId);
                    let cant = 0;
                    if (m.modo === "rendimiento") cant = m.valor > 0 ? 1 / m.valor : 1;
                    else cant = m.valor;
                    return { material_id: m.materialId, nombre: matDb ? matDb.nombre : "Insumo", cantidad: cant };
                });

            setCart([...cart, {
                id: Date.now().toString(),
                producto: productoActual,
                cantidadCliente: cantidadAAgregar,
                receta: recetaDelProducto
            }]);

            setProductoActual(null);
            setNombreProducto("");
            setSkuProducto("");
            setListaMateriales([{ uniqueId: Date.now().toString(), materialId: "", modo: "rendimiento", valor: 1 }]);
            setListaMaquinas([{ uniqueId: (Date.now() + 1).toString(), machineId: "", minutos: 0 }]);
            setCantidadAAgregar(1);

            // Refrescar el select de catálogo al estado inicial no es estrictamente necesario,
            // pero le da una mejor experiencia visual.
        }
    };

    const quitarDelPresupuesto = (id: string) => setCart(cart.filter(item => item.id !== id));

    const totalPresupuesto = cart.reduce((total, item) => total + (item.producto.precio_venta_sugerido * item.cantidadCliente), 0);
    const costoTotalPresupuesto = cart.reduce((total, item) => total + (item.producto.costo_total_produccion * item.cantidadCliente), 0);

    const handleGuardarEnHistorial = async () => {
        if (!cliente) { alert("Por favor, ingresá el nombre del cliente."); return; }
        setIsSavingBudget(true);

        const { data: { user } } = await supabase.auth.getUser();
        const emailUsuario = user?.email || "Usuario Desconocido";

        const payload = {
            cliente,
            referencia,
            total: totalPresupuesto,
            creador: emailUsuario,
            items: cart.map(item => ({
                producto_nombre: item.producto.nombre,
                cantidad: item.cantidadCliente,
                precio_unitario: item.producto.precio_venta_sugerido,
                receta: item.receta
            }))
        };

        try {
            const res = await fetch("/api/presupuestos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error("Error al guardar");
            alert("¡Presupuesto guardado en el historial!");
            setIsSaveModalOpen(false); setCliente(""); setReferencia(""); setCart([]);
        } catch (error) { console.error(error); alert("Hubo un error al guardar el presupuesto."); } finally { setIsSavingBudget(false); }
    };

    const compartirPorWhatsApp = () => {
        if (cart.length === 0) return;

        // Armamos el texto en un array para proteger los saltos de línea
        const lineas = [];

        lineas.push(cliente ? `Hola ${cliente}!` : `Hola!`);
        lineas.push(`Te comparto el detalle de tu presupuesto:`);
        lineas.push(""); // Línea vacía

        cart.forEach(item => {
            lineas.push(`• ${item.cantidadCliente}x *${item.producto.nombre}* - $${(item.producto.precio_venta_sugerido * item.cantidadCliente).toFixed(0)}`);
        });

        lineas.push(""); // Línea vacía
        lineas.push(`*Total a abonar: $${totalPresupuesto.toFixed(0)}*`);

        if (referencia) {
            lineas.push("");
            lineas.push(`_Notas: ${referencia}_`);
        }

        lineas.push(""); // Línea vacía
        lineas.push(`Quedo a tu disposición por cualquier consulta. ¡Gracias!`);

        // Unimos con el código exacto de salto de línea que exige WhatsApp (%0A)
        const textoFinal = lineas.join('\n');

        const url = `https://wa.me/?text=${encodeURIComponent(textoFinal)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const generarPDF = async () => {
        if (cart.length === 0) return;
        const doc = new jsPDF();
        const purpleColor: [number, number, number] = [63, 29, 133];
        const mintColor: [number, number, number] = [181, 232, 213];

        type PDFWithGState = jsPDF & { GState: new (opts: { opacity: number }) => Parameters<jsPDF["setGState"]>[0] };
        const advancedDoc = doc as PDFWithGState;

        const loadImage = (url: string): Promise<HTMLImageElement | null> => {
            return new Promise((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = url; });
        };

        const mascotaImg = await loadImage('/mascota-color.jpg');
        const logoImg = await loadImage('/logo-main.png');

        if (mascotaImg) {
            doc.setGState(new advancedDoc.GState({ opacity: 0.12 }));
            doc.addImage(mascotaImg, 'JPEG', 45, 100, 120, 120);
            doc.setGState(new advancedDoc.GState({ opacity: 1 }));
        }

        if (logoImg) {
            doc.addImage(logoImg, 'PNG', 14, 15, 60, 24);
        } else {
            doc.setTextColor(purpleColor[0], purpleColor[1], purpleColor[2]);
            doc.setFontSize(24); doc.setFont("helvetica", "bold"); doc.text("BAKU-SAN", 14, 25);
        }

        doc.setFontSize(10); doc.setTextColor(100); doc.setFont("helvetica", "normal");
        doc.text("Presupuesto Oficial", 196, 20, { align: "right" });
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 196, 26, { align: "right" });
        doc.text("Villa Gobernador Gálvez, Santa Fe", 196, 32, { align: "right" });

        doc.setDrawColor(mintColor[0], mintColor[1], mintColor[2]); doc.setLineWidth(0.5); doc.line(14, 45, 196, 45);
        doc.setFontSize(16); doc.setTextColor(purpleColor[0], purpleColor[1], purpleColor[2]); doc.setFont("helvetica", "bold"); doc.text("Detalle de Cotización", 14, 55);

        const tableData = cart.map((item) => [ item.producto.nombre, item.cantidadCliente.toString(), `$${item.producto.precio_venta_sugerido.toFixed(2)}`, `$${(item.producto.precio_venta_sugerido * item.cantidadCliente).toFixed(2)}` ]);

        autoTable(doc, {
            startY: 65, head: [['Producto / Descripción', 'Cantidad', 'Precio Unit.', 'Subtotal']], body: tableData, theme: 'striped',
            headStyles: { fillColor: purpleColor, textColor: 255, fontStyle: 'bold' }, styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } }
        });

        const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

        doc.setGState(new advancedDoc.GState({ opacity: 0.3 })); doc.setFillColor(248, 250, 252); doc.roundedRect(120, finalY - 5, 76, 25, 3, 3, "F"); doc.setGState(new advancedDoc.GState({ opacity: 1 }));
        doc.setFontSize(12); doc.setTextColor(100); doc.setFont("helvetica", "normal"); doc.text("Total Presupuesto:", 125, finalY + 5);
        doc.setFontSize(16); doc.setTextColor(purpleColor[0], purpleColor[1], purpleColor[2]); doc.setFont("helvetica", "bold"); doc.text(`$${totalPresupuesto.toFixed(0)}`, 190, finalY + 6, { align: "right" });
        doc.setFontSize(9); doc.setTextColor(150); doc.setFont("helvetica", "italic"); doc.text("Los precios están sujetos a modificaciones. Presupuesto válido por 7 días.", 105, 280, { align: "center" });

        doc.save(`Presupuesto_BakuSan_${Date.now()}.pdf`);
    };

    return (
        <div className="p-8 space-y-6 antialiased">
            <div className="flex items-center space-x-3 text-baku-deep mb-8">
                <ListChecks className="h-8 w-8 text-baku-purple" />
                <h1 className="text-3xl font-black tracking-tighter uppercase italic">Generador de Presupuestos</h1>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
                <Card className="lg:col-span-7 border-none shadow-md bg-white/90 backdrop-blur-sm sticky top-4">
                    <CardHeader className="border-b border-baku-mint/30 pb-4">
                        <CardTitle className="text-xl text-baku-deep flex items-center">
                            <Cpu className="mr-2 h-5 w-5 text-baku-pink" /> 1. Armar Producto
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

                        {/* --- NUEVO: SELECTOR DE CATÁLOGO --- */}
                        <div className="bg-baku-purple/5 p-4 rounded-xl border border-baku-purple/20">
                            <Label className="text-baku-deep font-bold mb-2 flex items-center">
                                <BookOpen className="mr-2 h-4 w-4 text-baku-purple" />
                                Cargar desde Catálogo (Opcional)
                            </Label>
                            <Select onValueChange={handleCargarDesdeCatalogo}>
                                <SelectTrigger className="bg-white focus:ring-baku-purple">
                                    <SelectValue placeholder="Seleccionar un producto guardado..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white max-h-60">
                                    <SelectItem value="none" className="font-bold text-baku-pink">
                                        + Crear Producto Nuevo (Limpiar)
                                    </SelectItem>
                                    {catalogo.map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.sku ? `[${c.sku}] ` : ''}{c.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-8 space-y-2">
                                <Label className="text-baku-purple font-bold">Nombre del Producto</Label>
                                <Input placeholder="Ej: Cuaderno A5 Personalizado" className="focus-visible:ring-baku-purple" value={nombreProducto} onChange={(e) => setNombreProducto(e.target.value)} />
                            </div>
                            <div className="col-span-4 space-y-2">
                                <Label className="text-slate-600">Código SKU</Label>
                                <Input placeholder="CUAD-01" className="focus-visible:ring-baku-purple text-slate-500 uppercase" value={skuProducto} onChange={(e) => setSkuProducto(e.target.value)} />
                            </div>
                        </div>

                        <Separator className="bg-slate-100" />

                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-700 flex items-center text-sm uppercase tracking-wider">
                                <Package className="mr-2 h-4 w-4 text-baku-purple"/> A. Insumos
                            </h3>
                            {listaMateriales.map((row, index) => (
                                <div key={row.uniqueId} className="bg-baku-mint/10 p-4 rounded-xl border border-baku-mint/30 relative group">
                                    {listaMateriales.length > 1 && (
                                        <Button variant="ghost" size="icon" onClick={() => removeMaterialRow(row.uniqueId)} className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white shadow border border-red-100 text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4" /></Button>
                                    )}
                                    <div className="grid grid-cols-12 gap-4">
                                        <div className="col-span-5 space-y-2">
                                            <Label className="text-slate-600">Material #{index + 1}</Label>
                                            <Select value={row.materialId} onValueChange={(val) => updateMaterialRow(row.uniqueId, "materialId", val)}>
                                                <SelectTrigger className="bg-white focus:ring-baku-purple"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                                <SelectContent position="popper" sideOffset={4} className="bg-white">
                                                    {materiales.map(m => (<SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-4 space-y-2">
                                            <Label className="text-slate-600">Modo</Label>
                                            <Select value={row.modo} onValueChange={(val) => updateMaterialRow(row.uniqueId, "modo", val)}>
                                                <SelectTrigger className="bg-white focus:ring-baku-purple"><SelectValue /></SelectTrigger>
                                                <SelectContent position="popper" sideOffset={4} className="bg-white">
                                                    <SelectItem value="rendimiento">Fraccionar</SelectItem>
                                                    <SelectItem value="cantidad">Exacto</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-3 space-y-2">
                                            <Label className="text-slate-600">{row.modo === "rendimiento" ? "¿Rinde?" : "¿Usás?"}</Label>
                                            <div className="flex items-center space-x-2">
                                                <Input type="number" min="0" step="any" className="bg-white focus-visible:ring-baku-purple font-bold text-center px-2" value={row.valor} onChange={(e) => updateMaterialRow(row.uniqueId, "valor", Number(e.target.value))} />
                                                {row.modo === "rendimiento" && (
                                                    <Button variant="outline" size="icon" className="shrink-0 text-baku-deep border-baku-purple/50 hover:bg-baku-mint/50" disabled={!row.materialId} onClick={() => openYieldAssistant(row.uniqueId)}><Scissors className="h-4 w-4" /></Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <Button variant="outline" onClick={addMaterialRow} className="w-full border-dashed border-2 border-baku-purple/30 text-baku-purple hover:bg-baku-purple/5 hover:border-baku-purple transition-all">
                                <Plus className="mr-2 h-4 w-4" /> Agregar Insumo
                            </Button>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <h3 className="font-bold text-slate-700 flex items-center text-sm uppercase tracking-wider">
                                <Zap className="mr-2 h-4 w-4 text-yellow-500"/> B. Maquinaria
                            </h3>
                            {listaMaquinas.map((row, index) => (
                                <div key={row.uniqueId} className="bg-baku-purple/5 p-4 rounded-xl border border-baku-purple/20 relative group">
                                    {listaMaquinas.length > 1 && (
                                        <Button variant="ghost" size="icon" onClick={() => removeMachineRow(row.uniqueId)} className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white shadow border border-red-100 text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4" /></Button>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-slate-600">Máquina #{index + 1}</Label>
                                            <Select value={row.machineId} onValueChange={(val) => updateMachineRow(row.uniqueId, "machineId", val)}>
                                                <SelectTrigger className="bg-white focus:ring-baku-purple"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                                <SelectContent position="popper" sideOffset={4} className="bg-white">{maquinas.map(m => (<SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>))}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-600">Minutos</Label>
                                            <Input type="number" className="bg-white focus-visible:ring-baku-purple" value={row.minutos} onChange={(e) => updateMachineRow(row.uniqueId, "minutos", Number(e.target.value))} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <Button variant="outline" onClick={addMachineRow} className="w-full border-dashed border-2 border-yellow-500/30 text-yellow-600 hover:bg-yellow-50 hover:border-yellow-500 transition-all">
                                <Plus className="mr-2 h-4 w-4" /> Agregar Máquina
                            </Button>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <div className="space-y-2">
                                <Label className="text-baku-purple font-bold flex items-center"><TrendingUp className="mr-2 h-4 w-4" /> Margen de Ganancia (%)</Label>
                                <Input type="number" className="focus-visible:ring-baku-purple border-baku-pink w-1/2 text-lg" value={margenGanancia} onChange={(e) => setMargenGanancia(Number(e.target.value))} />
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="pt-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                        <Button onClick={handleCalcularCostoBase} disabled={isCalculating} className="w-full bg-baku-deep hover:bg-baku-purple text-white shadow-lg transition-transform active:scale-95 py-6 text-lg rounded-xl">
                            <Calculator className="mr-2 h-5 w-5" /> {isCalculating ? "Procesando..." : "Calcular Costo Unitario"}
                        </Button>
                    </CardFooter>
                </Card>

                <div className="lg:col-span-5 space-y-6">

                    {productoActual && (
                        <Card className="border-t-4 border-t-baku-pink shadow-xl bg-white animate-in slide-in-from-top-4 fade-in duration-500 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-baku-pink/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold tracking-widest text-slate-400 uppercase">Costo Unitario Calculado</CardTitle>
                                <h2 className="text-xl font-black text-baku-deep leading-tight mt-1">{productoActual.nombre}</h2>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-2 relative z-10">
                                <div className="flex justify-between items-center text-sm border-b pb-2 border-slate-100">
                                    <span className="text-slate-600">Costo Base Taller</span>
                                    <span className="font-bold text-slate-800">${productoActual.costo_total_produccion.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm border-b pb-2 border-slate-100">
                                    <span className="text-slate-600">Precio Venta (Unidad)</span>
                                    <span className="font-black text-baku-purple text-lg">${productoActual.precio_venta_sugerido.toFixed(2)}</span>
                                </div>

                                <div className="pt-2">
                                    <Button variant="outline" onClick={handleGuardarCatalogo} disabled={isSavingCatalogo} className="w-full text-baku-purple border-baku-purple hover:bg-baku-purple/10">
                                        <BookmarkPlus className="mr-2 h-4 w-4" /> {isSavingCatalogo ? "Guardando..." : "Guardar en Catálogo Fijo"}
                                    </Button>
                                </div>

                                <div className="bg-baku-mint/20 p-4 rounded-xl mt-4 border border-baku-mint/50">
                                    <Label className="text-baku-deep font-bold block mb-2">¿Cuántas unidades para el presupuesto?</Label>
                                    <div className="flex items-center space-x-3">
                                        <Input type="number" min="1" className="w-24 text-center font-bold text-lg bg-white focus-visible:ring-baku-purple" value={cantidadAAgregar} onChange={(e) => setCantidadAAgregar(Number(e.target.value))} />
                                        <Button onClick={agregarAlPresupuesto} className="flex-1 bg-baku-purple hover:bg-baku-deep text-white">
                                            <ShoppingCart className="mr-2 h-4 w-4" /> Sumar al Presupuesto
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card className={`border-t-8 shadow-xl transition-all duration-500 ${cart.length > 0 ? 'border-t-baku-deep bg-white' : 'border-t-slate-300 bg-slate-50 opacity-70'}`}>
                        <CardHeader className="pb-4 border-b border-slate-100">
                            <CardTitle className="text-lg font-bold text-baku-deep flex items-center justify-between">
                                <div className="flex items-center">
                                    <Receipt className="mr-2 h-5 w-5 text-baku-purple" />
                                    Presupuesto Final
                                </div>
                                {cart.length > 0 && (
                                    <div className="flex space-x-2">
                                        <Button onClick={() => setIsSaveModalOpen(true)} size="sm" className="bg-baku-deep hover:bg-baku-purple text-white animate-in zoom-in duration-300">
                                            <Save className="mr-2 h-4 w-4" /> Guardar
                                        </Button>
                                        <Button onClick={compartirPorWhatsApp} size="sm" className="bg-[#25D366] hover:bg-[#1DA851] text-white shadow-md animate-in zoom-in duration-300">
                                            <Send className="mr-2 h-4 w-4" /> Enviar
                                        </Button>
                                        <Button onClick={generarPDF} size="sm" className="bg-slate-800 hover:bg-slate-900 text-white animate-in zoom-in duration-300">
                                            <FileDown className="mr-2 h-4 w-4" /> PDF
                                        </Button>
                                    </div>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 px-4 space-y-4">
                            {cart.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    Calculá un producto a la izquierda y agregalo acá para armar el presupuesto.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cart.map((item) => (
                                        <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 group">
                                            <div className="flex-1 pr-4">
                                                <p className="font-bold text-sm text-baku-deep leading-tight">{item.producto.nombre}</p>
                                                <p className="text-xs text-slate-500 mt-1">{item.cantidadCliente} unid. x ${item.producto.precio_venta_sugerido.toFixed(0)}</p>
                                            </div>
                                            <div className="text-right flex items-center space-x-3">
                                                <span className="font-black text-baku-purple">
                                                  ${(item.producto.precio_venta_sugerido * item.cantidadCliente).toFixed(0)}
                                                </span>
                                                <Button variant="ghost" size="icon" onClick={() => quitarDelPresupuesto(item.id)} className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}

                                    <Separator className="my-4 bg-slate-200" />

                                    <div className="space-y-1 pt-2">
                                        <div className="flex justify-between text-xs text-slate-500 uppercase tracking-wider font-bold">
                                            <span>Costo Base Total</span>
                                            <span>${costoTotalPresupuesto.toFixed(0)}</span>
                                        </div>
                                        <div className="flex justify-between items-end pt-2">
                                            <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">Total Cliente</span>
                                            <span className="text-5xl font-black text-baku-deep tracking-tighter">
                                                ${totalPresupuesto.toFixed(0)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={openModalCortes} onOpenChange={setOpenModalCortes}>
                <DialogContent className="sm:max-w-106.25">
                    <DialogHeader><DialogTitle className="flex items-center text-baku-deep"><Scissors className="mr-2 h-5 w-5 text-baku-pink" /> Motor de Cortes</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <p className="text-xs text-slate-500 mb-2">Ingresá las medidas en milímetros (mm).</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Ancho Plancha</Label><Input type="number" value={cortePlanchaW} onChange={e => setCortePlanchaW(Number(e.target.value))} /></div>
                            <div className="space-y-2"><Label>Largo Plancha</Label><Input type="number" value={cortePlanchaL} onChange={e => setCortePlanchaL(Number(e.target.value))} /></div>
                            <div className="space-y-2"><Label>Ancho Pieza</Label><Input type="number" value={cortePiezaW} onChange={e => setCortePiezaW(Number(e.target.value))} /></div>
                            <div className="space-y-2"><Label>Largo Pieza</Label><Input type="number" value={cortePiezaL} onChange={e => setCortePiezaL(Number(e.target.value))} /></div>
                            <div className="space-y-2 col-span-2"><Label>Grosor Láser (Margen)</Label><Input type="number" value={corteMargen} onChange={e => setCorteMargen(Number(e.target.value))} /></div>
                        </div>
                        <Button onClick={handleCalcularRendimiento} disabled={isCorteLoading} className="w-full bg-baku-purple hover:bg-baku-deep text-white mt-2">{isCorteLoading ? "Calculando..." : "Calcular Piezas"}</Button>
                        {corteResultado && (
                            <div className="mt-4 p-4 bg-baku-mint/20 rounded-lg border border-baku-mint/50 text-center animate-in fade-in">
                                <p className="text-4xl font-black text-baku-deep">{corteResultado.total_piezas} <span className="text-lg">piezas</span></p>
                                <p className="text-xs text-orange-500 mt-2">Desperdicio: {corteResultado.porcentaje_desperdicio}%</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpenModalCortes(false)}>Cancelar</Button>
                        <Button onClick={aplicarCorte} disabled={!corteResultado} className="bg-baku-deep text-white">Aplicar a Fila</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-baku-deep flex items-center">
                            <Save className="mr-2 h-5 w-5 text-baku-purple" />
                            Guardar Presupuesto
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Nombre del Cliente</Label>
                            <Input placeholder="Ej: Juan Pérez" value={cliente} onChange={e => setCliente(e.target.value)} className="focus-visible:ring-baku-purple" />
                        </div>
                        <div className="space-y-2">
                            <Label>Referencia / Notas (Opcional)</Label>
                            <textarea
                                className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-baku-purple"
                                placeholder="Ej: Para entregar el viernes, incluye seña..."
                                value={referencia}
                                onChange={e => setReferencia(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSaveModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleGuardarEnHistorial} disabled={isSavingBudget} className="bg-baku-deep text-white">
                            {isSavingBudget ? "Guardando..." : "Confirmar y Guardar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}