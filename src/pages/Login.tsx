import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Lock } from "lucide-react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Si todo sale bien, la página se recargará automáticamente por nuestro guardián en App.tsx
        } catch (err: any) {
            setError(err.message === "Invalid login credentials" ? "Correo o contraseña incorrectos" : "Error al iniciar sesión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
            {/* Fondo decorativo */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-baku-purple/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-baku-mint/30 rounded-full blur-3xl"></div>

            <Card className="w-full max-w-md border-t-4 border-t-baku-purple shadow-xl z-10 bg-white/90 backdrop-blur-sm">
                <CardHeader className="space-y-3 text-center pb-6">
                    <div className="flex justify-center mb-2">
                        {/* Acá podrías poner el <img src="/logo-main.png" /> en el futuro */}
                        <div className="h-16 w-16 bg-baku-deep rounded-full flex items-center justify-center shadow-lg">
                            <Lock className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-black text-baku-deep tracking-tighter uppercase italic">
                        BAKU-SAN ERP
                    </CardTitle>
                    <CardDescription className="text-slate-500 font-medium">
                        Ingresá tus credenciales para acceder al sistema
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold">Correo Electrónico</Label>
                            <Input
                                type="email"
                                placeholder="ejemplo@bakusan.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="focus-visible:ring-baku-purple bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold">Contraseña</Label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="focus-visible:ring-baku-purple bg-white"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm font-medium text-center">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-baku-deep hover:bg-baku-purple text-white py-6 text-lg font-bold shadow-md transition-transform active:scale-95"
                            disabled={loading}
                        >
                            {loading ? "Verificando..." : "Iniciar Sesión"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}