'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/store/useCart';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Minus, Search, Utensils, X, ChevronRight } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const { items, addItem, removeItem, updateItemNota, getTotal, clearCart, setMesaId, mesaId } = useCart();
  const [generalNote, setGeneralNote] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [sendingOrder, setSendingOrder] = useState(false);

  useEffect(() => {
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const formattedData = data ? data.map((p: any) => ({ ...p, precio: Number(p.precio) })) : [];
          setProductos(formattedData);
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Error desconocido';
        setFetchError(errMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();

    // Realtime subscription for availability updates
    const channel = supabase
      .channel('public:productos')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'productos' }, (payload) => {
        setProductos((current) => 
          current
            .map(p => p.id === payload.new.id ? { ...p, disponible: payload.new.disponible } : p)
            .filter(p => p.disponible)
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setMesaId]);

  const categorias = ['bebida', 'entrante', 'pescado', 'carne', 'postre'];
  const cartTotalItems = items.reduce((acc, item) => acc + item.cantidad, 0);

  const handleEnviarCocina = async () => {
    if (items.length === 0) return;
    setSendingOrder(true);

    try {
      const { error } = await supabase.from('comandas').insert({
        mesa_id: mesaId || 1,
        items: items,
        estado: 'pendiente',
        notas_cliente: generalNote || null,
        total: getTotal()
      });

      if (error) {
        alert('Error al enviar el pedido: ' + error.message);
      } else {
        alert('¡Pedido enviado a cocina! Tu plato se está preparando.');
        clearCart();
        setGeneralNote('');
        setIsCartOpen(false);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      alert('Error: ' + errMsg);
    } finally {
      setSendingOrder(false);
    }
  };

  const getProductQuantityInCart = (id: string) => {
    const item = items.find(i => i.producto_id === id);
    return item ? item.cantidad : 0;
  };

  const filteredProductos = productos.filter(p => {
    const matchesCategory = p.categoria === activeTab;
    const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#005BB7] border-t-transparent mb-4"></div>
        <p className="text-slate-600 font-medium">Cargando nuestra carta premium...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-50 text-red-500 p-4 rounded-full mb-4">
          <X className="w-8 h-8" />
        </div>
        <p className="text-red-600 font-bold text-lg">Error al cargar la carta</p>
        <p className="text-slate-500 text-sm mt-1">{fetchError}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20 lg:pb-8 flex flex-col">
      {/* HEADER PREMIUM */}
      <header className="bg-gradient-to-r from-[#005BB7] to-[#0083B0] text-white py-4 px-4 sm:px-6 sticky top-0 z-20 shadow-md backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl">
              <Utensils className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight flex items-center gap-2">
                JaénTap
              </h1>
              <p className="text-xs text-blue-100 font-medium">Tapas & Gastronomía Local</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="bg-white/20 text-white font-extrabold text-sm px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
              Mesa {mesaId || 1}
            </span>
            <Button 
              variant="outline" 
              className="lg:hidden text-white bg-white/10 hover:bg-white/20 border-white/20 rounded-full h-11 w-11 p-0 shrink-0 relative"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartTotalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#00C853] text-white text-xs font-black rounded-full h-5 w-5 flex items-center justify-center border-2 border-[#005BB7] animate-bounce">
                  {cartTotalItems}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 flex flex-col lg:flex-row gap-8">
        
        {/* COLUMNA MENÚ */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* BARRA BUSQUEDA & BIENVENIDA */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Digital Menu</h2>
              <p className="text-sm text-slate-500 font-medium">Selecciona tus platos favoritos de nuestra cocina tradicional</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
              <input
                type="text"
                placeholder="Buscar plato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#005BB7] focus:border-transparent transition-all shadow-sm"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* NAVEGACIÓN CATEGORÍAS */}
          <div className="-mx-4 sm:mx-0 mb-6 overflow-x-auto scrollbar-none flex px-4 sm:px-0">
            <div className="flex gap-2 sm:gap-3 py-1">
              {categorias.map(cat => {
                const isActive = activeTab === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveTab(cat)}
                    className={`capitalize px-6 py-2.5 rounded-full text-sm font-extrabold whitespace-nowrap transition-all flex-shrink-0 shadow-sm ${
                      isActive
                        ? 'bg-gradient-to-r from-[#005BB7] to-[#0083B0] text-white scale-105 shadow-md shadow-blue-100'
                        : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {cat}s
                  </button>
                );
              })}
            </div>
          </div>

          {/* GRID DE PRODUCTOS */}
          <div className="flex-1">
            {filteredProductos.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                <div className="bg-slate-50 p-4 rounded-full mb-3 text-slate-400">
                  <Utensils className="h-8 w-8" />
                </div>
                <p className="text-slate-700 font-bold text-lg">No encontramos productos</p>
                <p className="text-slate-400 text-sm mt-1">Intenta con otra categoría o cambiando la búsqueda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProductos.map(producto => {
                  const qty = getProductQuantityInCart(producto.id);
                  const isSelected = qty > 0;
                  return (
                    <Card 
                      key={producto.id} 
                      className={`group overflow-hidden rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col relative ${
                        isSelected ? 'ring-2 ring-[#005BB7] bg-blue-50/10' : 'bg-white'
                      }`}
                    >
                      {/* Imagen con zoom y badge de cantidad */}
                      <div className="h-44 sm:h-48 overflow-hidden bg-slate-100 relative shrink-0">
                        <img 
                          src={producto.imagen_url} 
                          alt={producto.nombre} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        {isSelected && (
                          <div className="absolute top-3 left-3 bg-[#00C853] text-white text-xs font-black px-3 py-1 rounded-full shadow-lg border border-white/20 animate-scale-in">
                            {qty} en pedido
                          </div>
                        )}
                        
                        <div className="absolute bottom-3 right-3">
                          <Badge className="bg-white/95 text-slate-900 font-black text-sm px-3 py-1 rounded-full shadow-md backdrop-blur-sm border border-slate-100">
                            {producto.precio.toFixed(2)}€
                          </Badge>
                        </div>
                      </div>

                      {/* Contenido */}
                      <CardHeader className="p-5 pb-2 flex-1 flex flex-col justify-between">
                        <div>
                          <CardTitle className="text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-[#005BB7] transition-colors">
                            {producto.nombre}
                          </CardTitle>
                          <p className="text-xs text-slate-400 font-medium capitalize mt-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                            {producto.categoria}
                          </p>
                        </div>
                      </CardHeader>

                      {/* Botón de acción adaptativo */}
                      <CardFooter className="p-5 pt-2 shrink-0">
                        {isSelected ? (
                          <div className="flex items-center justify-between w-full bg-[#E3F2FD] rounded-2xl p-1 border border-blue-100">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 text-[#005BB7] hover:bg-[#B3E5FC] rounded-xl shrink-0"
                              onClick={() => removeItem(producto.id, '')}
                            >
                              <Minus className="h-4.5 w-4.5 font-bold" />
                            </Button>
                            <span className="font-black text-[#005BB7] px-2 text-base">{qty}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 text-[#005BB7] hover:bg-[#B3E5FC] rounded-xl shrink-0"
                              onClick={() => addItem({
                                producto_id: producto.id,
                                nombre: producto.nombre,
                                precio: producto.precio,
                                notas: ''
                              })}
                            >
                              <Plus className="h-4.5 w-4.5 font-bold" />
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            className="w-full bg-[#005BB7] hover:bg-[#004A99] text-white font-extrabold rounded-2xl py-5 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                            onClick={() => addItem({
                              producto_id: producto.id,
                              nombre: producto.nombre,
                              precio: producto.precio,
                              notas: ''
                            })}
                          >
                            <Plus className="h-4.5 w-4.5" /> Añadir
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA CARRITO DESKTOP (STICKY) */}
        <aside className="hidden lg:block w-[380px] shrink-0">
          <div className="sticky top-24 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
            <div className="p-5 bg-gradient-to-r from-[#005BB7] to-[#0083B0] text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <h3 className="font-black text-lg">Mi Pedido</h3>
              </div>
              <Badge className="bg-white/20 text-white font-bold px-2.5 py-0.5 rounded-full">
                {cartTotalItems} items
              </Badge>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 min-h-[200px]">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                  <ShoppingCart className="w-16 h-16 mb-4 opacity-15 text-slate-600" />
                  <p className="font-bold text-slate-600">Carrito vacío</p>
                  <p className="text-xs text-slate-400 text-center px-4 mt-1">Selecciona platos del menú para añadirlos a tu comanda.</p>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-100 transition-colors animate-scale-in flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <div className="flex-1 mr-3">
                        <p className="font-bold text-slate-800 text-sm leading-snug">{item.nombre}</p>
                        <p className="text-xs text-[#005BB7] font-extrabold mt-1">{item.cantidad} x {item.precio.toFixed(2)}€</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 text-red-500 border-red-100 hover:bg-red-50 rounded-lg"
                          onClick={() => removeItem(item.producto_id, item.notas)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {/* Nota del plato */}
                    <div className="relative mt-1">
                      <input
                        type="text"
                        placeholder="Añadir nota (ej: sin cebolla, poco hecho)..."
                        value={item.notas || ''}
                        onChange={(e) => updateItemNota(item.producto_id, item.notas, e.target.value)}
                        className="w-full text-[11px] bg-slate-50 border border-slate-100 focus:border-blue-200 focus:bg-white rounded-xl px-3 py-1.5 focus:outline-none text-slate-600 font-medium transition-all"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="px-5 py-3 bg-slate-50 border-t border-b border-slate-100">
                <label className="block text-[11px] font-black text-slate-500 mb-1">Notas generales para la cocina:</label>
                <textarea
                  placeholder="Ej: cubiertos, alérgenos, traer bebidas primero..."
                  value={generalNote}
                  onChange={(e) => setGeneralNote(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 focus:border-blue-200 rounded-xl px-3 py-2 focus:outline-none text-slate-700 font-medium transition-all resize-none h-16"
                />
              </div>
            )}

            <div className="p-6 border-t bg-white shadow-2xl relative z-10 shrink-0">
              <div className="flex justify-between items-center mb-4 text-xs font-bold text-slate-400">
                <span>I.V.A (10% Incl.):</span>
                <span>{(getTotal() - (getTotal() / 1.1)).toFixed(2)}€</span>
              </div>
              <div className="flex justify-between items-center mb-6 pt-3 border-t border-dashed">
                <span className="font-black text-slate-800 text-lg">Total Pedido:</span>
                <span className="font-black text-[#005BB7] text-2xl">{getTotal().toFixed(2)}€</span>
              </div>
              <Button 
                className="w-full bg-[#00C853] hover:bg-green-600 text-white font-extrabold text-base py-6 rounded-2xl shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                disabled={items.length === 0 || sendingOrder}
                onClick={handleEnviarCocina}
              >
                {sendingOrder ? 'Enviando...' : 'Enviar Pedido a Cocina'}
              </Button>
            </div>
          </div>
        </aside>
      </main>

      {/* BARRA FLOTANTE MÓVIL (STICKY EN LA PARTE INFERIOR) */}
      {cartTotalItems > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md shadow-[0_-8px_30px_rgba(0,0,0,0.1)] border-t border-slate-100 z-30 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-extrabold">Tu Pedido ({cartTotalItems} items)</span>
              <span className="text-xl font-black text-[#005BB7]">{getTotal().toFixed(2)}€</span>
            </div>
            <Button 
              className="bg-[#005BB7] hover:bg-[#004A99] text-white font-black px-6 py-5 rounded-2xl flex items-center gap-2 shadow-md shadow-blue-100 text-sm"
              onClick={() => setIsCartOpen(true)}
            >
              Ver Pedido <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* DRAWER / BOTTOM SHEET DEL CARRITO PARA MÓVIL */}
      {isCartOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 z-50 flex justify-end backdrop-blur-sm transition-all duration-300">
          <div className="bg-white w-full sm:max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-5 bg-gradient-to-r from-[#005BB7] to-[#0083B0] text-white flex justify-between items-center shrink-0 shadow-sm">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <h2 className="text-lg font-black">Mi Pedido ({cartTotalItems})</h2>
              </div>
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/10 rounded-full h-9 w-9 p-0"
                onClick={() => setIsCartOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                  <ShoppingCart className="w-16 h-16 mb-4 opacity-15 text-slate-600" />
                  <p className="font-bold text-slate-600">Carrito vacío</p>
                  <p className="text-xs text-slate-400 text-center px-4 mt-1">Selecciona platos de la carta.</p>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <div className="flex-1 mr-3">
                        <p className="font-bold text-slate-800 text-sm leading-snug">{item.nombre}</p>
                        <p className="text-xs text-[#005BB7] font-extrabold mt-1">{item.cantidad} x {item.precio.toFixed(2)}€</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 border-red-100 hover:bg-red-50 rounded-lg shrink-0"
                        onClick={() => removeItem(item.producto_id, item.notas)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {/* Nota del plato */}
                    <div className="relative mt-1">
                      <input
                        type="text"
                        placeholder="Añadir nota (ej: sin cebolla, poco hecho)..."
                        value={item.notas || ''}
                        onChange={(e) => updateItemNota(item.producto_id, item.notas, e.target.value)}
                        className="w-full text-[11px] bg-slate-50 border border-slate-100 focus:border-blue-200 focus:bg-white rounded-xl px-3 py-1.5 focus:outline-none text-slate-600 font-medium transition-all"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-b border-slate-100 shrink-0">
                <label className="block text-[11px] font-black text-slate-500 mb-1">Notas generales para la cocina:</label>
                <textarea
                  placeholder="Ej: cubiertos, alérgenos, traer bebidas primero..."
                  value={generalNote}
                  onChange={(e) => setGeneralNote(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 focus:border-blue-200 rounded-xl px-3 py-2 focus:outline-none text-slate-700 font-medium transition-all resize-none h-16"
                />
              </div>
            )}

            <div className="p-6 border-t bg-white shadow-2xl shrink-0">
              <div className="flex justify-between items-center mb-4 text-xs font-bold text-slate-400">
                <span>I.V.A (10% Incl.):</span>
                <span>{(getTotal() - (getTotal() / 1.1)).toFixed(2)}€</span>
              </div>
              <div className="flex justify-between items-center mb-6 pt-3 border-t border-dashed">
                <span className="font-black text-slate-800 text-base">Total Pedido:</span>
                <span className="font-black text-[#005BB7] text-xl">{getTotal().toFixed(2)}€</span>
              </div>
              <Button 
                className="w-full bg-[#00C853] hover:bg-green-600 text-white font-extrabold text-base py-6 rounded-2xl shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2"
                disabled={items.length === 0 || sendingOrder}
                onClick={handleEnviarCocina}
              >
                {sendingOrder ? 'Enviando...' : 'Enviar Pedido a Cocina'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
