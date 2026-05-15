'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/store/useCart';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Plus, Minus } from 'lucide-react';

interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  disponible: boolean;
  imagen_url: string;
}

export default function CartaDigital() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('bebida');
  const { items, addItem, removeItem, getTotal, clearCart, setMesaId } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    // Simulando que el token de la URL dicta la mesa 1
    const params = new URLSearchParams(window.location.search);
    const mesaParam = params.get('mesa') || '1';
    setMesaId(parseInt(mesaParam));

    const fetchProductos = async () => {
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('*')
          .eq('disponible', true);
        
        if (error) {
          console.error('Error fetching productos:', error);
          setFetchError(error.message);
        } else {
          const formattedData = data ? data.map((p: any) => ({ ...p, precio: Number(p.precio) })) : [];
          setProductos(formattedData);
        }
      } catch (err: any) {
        setFetchError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();

    // Realtime para cambios de disponibilidad
    const channel = supabase
      .channel('public:productos')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'productos' }, (payload) => {
        setProductos((current) => current.map(p => p.id === payload.new.id ? { ...p, disponible: payload.new.disponible } : p).filter(p => p.disponible));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setMesaId]);

  const categorias = ['bebida', 'entrante', 'pescado', 'carne', 'postre'];

  const handleEnviarCocina = async () => {
    if (items.length === 0) return;

    const { error } = await supabase.from('comandas').insert({
      mesa_id: 1, // hardcoded from the initial mock
      items: items,
      estado: 'pendiente',
      total: getTotal()
    });

    if (error) {
      alert('Error enviando la comanda: ' + error.message);
    } else {
      alert('¡Comanda enviada a cocina!');
      clearCart();
      setIsCartOpen(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando carta...</div>;
  if (fetchError) return <div className="p-8 text-center text-red-500 font-bold">Error cargando la carta: {fetchError}</div>;

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-900 pb-24">
      <header className="bg-[#005BB7] text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">JaénTap - Mesa 1</h1>
          <Button variant="outline" className="text-[#005BB7] bg-white hover:bg-[#E3F2FD] border-none" onClick={() => setIsCartOpen(!isCartOpen)}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            <span className="font-bold">{items.reduce((acc, item) => acc + item.cantidad, 0)}</span>
          </Button>
        </div>
      </header>

      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 flex justify-end backdrop-blur-sm transition-all">
          <div className="bg-white w-full sm:max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 bg-[#005BB7] text-white flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold">Mi Pedido</h2>
              <Button variant="ghost" className="text-white hover:bg-white/20" onClick={() => setIsCartOpen(false)}>Cerrar</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                  <p>Tu carrito está vacío</p>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex-1 mr-4">
                      <p className="font-bold text-slate-800">{item.nombre}</p>
                      <p className="text-sm text-slate-500 font-medium">{item.cantidad} x {item.precio.toFixed(2)}€</p>
                      {item.notas && <p className="text-xs text-[#005BB7] italic mt-1 bg-blue-50 px-2 py-1 rounded inline-block">&quot;{item.notas}&quot;</p>}
                    </div>
                    <Button variant="outline" size="icon" className="shrink-0 text-red-500 border-red-100 hover:bg-red-50" onClick={() => removeItem(item.producto_id, item.notas)}>
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            <div className="p-6 border-t bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-center mb-6 text-xl">
                <span className="font-medium text-slate-600">Total:</span>
                <span className="font-black text-slate-900">{getTotal().toFixed(2)}€</span>
              </div>
              <Button 
                className="w-full bg-[#00C853] hover:bg-green-600 text-white text-lg py-7 rounded-2xl shadow-lg shadow-green-200"
                disabled={items.length === 0}
                onClick={handleEnviarCocina}
              >
                Confirmar y Enviar a Cocina
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto p-4 sm:p-6 lg:p-8 mt-4">
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full flex flex-col">
          <TabsList className="w-full flex overflow-x-auto justify-start mb-6 bg-transparent">
            {categorias.map(cat => (
              <TabsTrigger key={cat} value={cat} className="capitalize flex-shrink-0 text-lg data-[state=active]:bg-[#005BB7] data-[state=active]:text-white rounded-full px-6 py-2">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-4 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {productos.filter(p => p.categoria === activeTab).map(producto => (
                <Card key={producto.id} className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow bg-white flex flex-col">
                  <div className="h-48 overflow-hidden bg-slate-200">
                    <img src={producto.imagen_url} alt={producto.nombre} className="w-full h-full object-cover transition-transform hover:scale-105" />
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl font-bold">{producto.nombre}</CardTitle>
                      <Badge variant="secondary" className="bg-[#E3F2FD] text-[#005BB7] font-bold text-sm">
                        {producto.precio.toFixed(2)}€
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-slate-500 capitalize">{producto.categoria}</p>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button 
                      className="w-full bg-[#005BB7] hover:bg-[#004A99] text-white"
                      onClick={() => addItem({
                        producto_id: producto.id,
                        nombre: producto.nombre,
                        precio: producto.precio,
                        notas: ''
                      })}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Añadir al Pedido
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
