import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, Tag, FileDown } from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CatalogoItem {
    id: string;
    nombre: string;
    sku: string;
    margen_ganancia_esperado: number;
    costo_total_produccion: number;
    precio_venta_sugerido: number;
}

export default function Catalogo() {
    const [productos, setProductos] = useState<CatalogoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetch("/api/catalogo")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setProductos(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error cargando catálogo:", err);
                setLoading(false);
            });
    }, []);

    const filteredProductos = productos.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const generarPDFListaPrecios = async () => {
        if (filteredProductos.length === 0) return;

        const doc = new jsPDF();
        const purpleColor: [number, number, number] = [63, 29, 133];
        const mintColor: [number, number, number] = [181, 232, 213];

        type PDFWithGState = jsPDF & { GState: new (opts: { opacity: number }) => Parameters<jsPDF["setGState"]>[0] };
        const advancedDoc = doc as PDFWithGState;

        const loadImage = (url: string): Promise<HTMLImageElement | null> => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = url;
            });
        };

        const mascotaImg = await loadImage('/mascota-color.jpg');
        const logoImg = await loadImage('/logo-main.png');

        if (mascotaImg) {
            doc.setGState(new advancedDoc.GState({ opacity: 0.1 }));
            doc.addImage(mascotaImg, 'JPEG', 45, 100, 120, 120);
            doc.setGState(new advancedDoc.GState({ opacity: 1 }));
        }

        if (logoImg) {
            doc.addImage(logoImg, 'PNG', 14, 15, 60, 24);
        } else {
            doc.setTextColor(purpleColor[0], purpleColor[1], purpleColor[2]);
            doc.setFontSize(24);
            doc.setFont("helvetica", "bold");
            doc.text("BAKU-SAN", 14, 25);
        }

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        doc.text("Lista de Precios Oficial", 196, 20, { align: "right" });
        doc.text(`Fecha de actualización: ${new Date().toLocaleDateString()}`, 196, 26, { align: "right" });

        doc.setDrawColor(mintColor[0], mintColor[1], mintColor[2]);
        doc.setLineWidth(0.5);
        doc.line(14, 45, 196, 45);

        const tableData = filteredProductos.map((item) => [
            item.sku || "N/A",
            item.nombre,
            `$${item.precio_venta_sugerido.toFixed(0)}`
        ]);

        autoTable(doc, {
            startY: 55,
            head: [['SKU', 'Producto', 'Precio de Venta']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: purpleColor, textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 11, cellPadding: 6 },
            columnStyles: {
                0: { halign: 'center', cellWidth: 40 },
                2: { halign: 'right', fontStyle: 'bold', textColor: purpleColor }
            }
        });

        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.setFont("helvetica", "italic");
        doc.text("Precios sujetos a modificación sin previo aviso.", 105, 280, { align: "center" });

        doc.save(`Lista_Precios_BakuSan_${Date.now()}.pdf`);
    };

    return (
        <div className="p-8 space-y-6 antialiased">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center space-x-3 text-baku-deep">
                    <BookOpen className="h-8 w-8 text-baku-purple" />
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase italic">Catálogo de Productos</h1>
                        <p className="text-sm text-slate-500 font-medium">Lista de precios con cálculo dinámico según insumos</p>
                    </div>
                </div>

                {productos.length > 0 && (
                    <Button onClick={generarPDFListaPrecios} className="bg-green-600 hover:bg-green-700 text-white shadow-md">
                        <FileDown className="mr-2 h-5 w-5" /> Exportar Lista a PDF
                    </Button>
                )}
            </div>

            <Card className="border-none shadow-md bg-white/90">
                <CardHeader className="border-b border-baku-mint/30 pb-4">
                    <CardTitle className="text-xl text-baku-deep flex items-center">
                        <Tag className="mr-2 h-5 w-5 text-baku-pink" />
                        Productos Guardados
                    </CardTitle>
                    <CardDescription>Los costos y precios se actualizan automáticamente según tu inventario actual.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-4 border-b border-slate-100 flex items-center bg-slate-50/50">
                        <Search className="h-5 w-5 text-slate-400 mr-2" />
                        <Input
                            placeholder="Buscar por nombre o SKU..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="max-w-md bg-white focus-visible:ring-baku-purple"
                        />
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-slate-400 animate-pulse font-medium">Calculando precios en vivo...</div>
                    ) : filteredProductos.length === 0 ? (
                        <div className="p-16 text-center flex flex-col items-center space-y-3">
                            <BookOpen className="h-16 w-16 text-slate-200 mb-2" />
                            <p className="text-lg font-bold text-slate-600">Catálogo vacío</p>
                            <p className="text-sm text-slate-400 max-w-sm">
                                Usá el Cotizador para armar un producto y hacé clic en "Guardar en Catálogo" para que aparezca acá.
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-white">
                                <TableRow className="border-b-baku-mint/30">
                                    <TableHead className="font-bold text-slate-600 w-[120px]">SKU</TableHead>
                                    <TableHead className="font-bold text-slate-600">Nombre del Producto</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-right">Costo Producción</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-center">Margen</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-right">Precio de Venta</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProductos.map((p) => (
                                    <TableRow key={p.id} className="hover:bg-baku-mint/5 transition-colors group">
                                        <TableCell className="text-slate-500 font-mono text-xs">{p.sku || "N/A"}</TableCell>
                                        <TableCell className="font-bold text-baku-deep">{p.nombre}</TableCell>
                                        <TableCell className="text-right text-slate-500">
                                            ${p.costo_total_produccion.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-center text-baku-pink font-bold">{p.margen_ganancia_esperado}%</TableCell>
                                        <TableCell className="text-right">
                      <span className="font-black text-baku-purple text-lg bg-baku-purple/5 px-3 py-1 rounded-lg">
                        ${p.precio_venta_sugerido.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                      </span>
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