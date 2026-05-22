'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  ShoppingBag, 
  PackageX, 
  Search, 
  DollarSign, 
  Check, 
  X, 
  RefreshCw, 
  ShieldCheck, 
  ArrowLeft,
  UtensilsCrossed
} from 'lucide-react';
import Link from 'next/link';

interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  disponible: boolean;
  imagen_url: string;
}

interface Comanda {
  id: string;
  mesa_id: number;
  total: number;
  estado: string;
  created_at: string;
  notas_cliente?: string;
}

export default function AdministracionDashboard() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('todos');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState('');

  const fetchDatos = async () => {
    try {
      setLoading(true);
      // Fetch productos
      const { data: prodData, error: prodError } = await supabase
        .from('productos')
        .select('*')
        .order('categoria', { ascending: true })
        .order('nombre', { ascending: true });

      if (prodError) throw prodError;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedProd = prodData ? prodData.map((p: any) => ({ ...p, precio: Number(p.precio) })) : [];
      setProductos(formattedProd);

      // Fetch comandas
      const { data: comData, error: comError } = await supabase
        .from('comandas')
        .select('*')
        .order('created_at', { ascending: false });

      if (comError) throw comError;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setComandas(comData ? comData.map((c: any) => ({ ...c, total: Number(c.total) })) : []);

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatos();

    // Subscribe to updates
    const prodChannel = supabase
      .channel('admin:productos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => {
        fetchDatos();
      })
      .subscribe();

    const comChannel = supabase
      .channel('admin:comandas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas' }, () => {
        fetchDatos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(prodChannel);
      supabase.removeChannel(comChannel);
    };
  }, []);

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('productos')
        .update({ disponible: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      setProductos(current => 
        current.map(p => p.id === id ? { ...p, disponible: !currentStatus } : p)
      );
    } catch (err) {
      alert('Error al actualizar disponibilidad: ' + (err as Error).message);
    }
  };

  const handleEditPrice = (producto: Producto) => {
    setEditingPriceId(producto.id);
    setTempPrice(producto.precio.toFixed(2));
  };

  const savePrice = async (id: string) => {
    const newPriceNum = parseFloat(tempPrice);
    if (isNaN(newPriceNum) || newPriceNum < 0) {
      alert('Introduce un precio válido');
      return;
    }

    try {
      const { error } = await supabase
        .from('productos')
        .update({ precio: newPriceNum })
        .eq('id', id);

      if (error) throw error;
      
      setProductos(current => 
        current.map(p => p.id === id ? { ...p, precio: newPriceNum } : p)
      );
      setEditingPriceId(null);
    } catch (err) {
      alert('Error al actualizar el precio: ' + (err as Error).message);
    }
  };

  // Metrics calculations
  const totalSales = comandas
    .filter(c => c.estado === 'entregado')
    .reduce((acc, c) => acc + c.total, 0);

  const activeOrdersCount = comandas
    .filter(c => ['pendiente', 'preparando', 'listo'].includes(c.estado))
    .length;

  const outOfStockCount = productos.filter(p => !p.disponible).length;

  const categorias = ['todos', 'bebida', 'entrante', 'pescado', 'carne', 'postre'];

  const filteredProductos = productos.filter(p => {
    const matchesCategory = activeCategory === 'todos' || p.categoria === activeCategory;
    const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-12 flex flex-col font-sans">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-[#1E293B] to-[#0F172A] text-white py-5 px-4 sm:px-6 sticky top-0 z-20 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="bg-white/10 hover:bg-white/20 p-2 rounded-xl text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-[#38BDF8]" />
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">Administración</h1>
              </div>
              <p className="text-xs text-slate-400 font-medium">Panel de Inventario & Gestión - JaénTap</p>
            </div>
          </div>
          
          <Button 
            onClick={fetchDatos}
            variant="outline" 
            className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700 rounded-xl flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Recargar Datos
          </Button>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 flex flex-col gap-8">
        
        {/* INDICADORES CLAVE */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-slate-200 rounded-3xl"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* VENTAS */}
            <Card className="rounded-3xl border border-slate-100 shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ventas Totales (Completadas)</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{totalSales.toFixed(2)}€</h3>
                  <p className="text-xs text-[#00C853] font-bold mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Funcionamiento en vivo
                  </p>
                </div>
                <div className="bg-emerald-50 text-[#00C853] p-4 rounded-2xl">
                  <DollarSign className="h-7 w-7" />
                </div>
              </CardContent>
            </Card>

            {/* PEDIDOS ACTIVOS */}
            <Card className="rounded-3xl border border-slate-100 shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pedidos en Curso</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{activeOrdersCount}</h3>
                  <p className="text-xs text-blue-500 font-bold mt-1">Sala & Cocina comunicados</p>
                </div>
                <div className="bg-blue-50 text-blue-500 p-4 rounded-2xl">
                  <ShoppingBag className="h-7 w-7" />
                </div>
              </CardContent>
            </Card>

            {/* PRODUCTOS FUERA DE STOCK */}
            <Card className="rounded-3xl border border-slate-100 shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platos Agotados</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{outOfStockCount}</h3>
                  <p className="text-xs text-amber-500 font-bold mt-1">Requieren atención</p>
                </div>
                <div className="bg-amber-50 text-amber-500 p-4 rounded-2xl">
                  <PackageX className="h-7 w-7" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* GESTIÓN DE PRODUCTOS */}
        <Card className="rounded-3xl border border-slate-100 shadow-sm bg-white overflow-hidden flex flex-col flex-1">
          <CardHeader className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <div>
              <CardTitle className="text-xl font-black text-slate-800">Inventario de Productos</CardTitle>
              <p className="text-xs text-slate-400 mt-1">Modifica precios y disponibilidad en tiempo real para todos los clientes</p>
            </div>
            
            {/* BUSCADOR */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar plato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#005BB7] transition-all bg-white"
              />
            </div>
          </CardHeader>

          {/* FILTRO CATEGORIAS */}
          <div className="px-6 py-4 border-b border-slate-100 overflow-x-auto scrollbar-none flex gap-2">
            {categorias.map(cat => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`capitalize px-4 py-2 rounded-xl text-xs font-black transition-all flex-shrink-0 border ${
                    isActive
                      ? 'bg-[#1E293B] border-[#1E293B] text-white'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {cat === 'todos' ? 'Todos los platos' : cat + 's'}
                </button>
              );
            })}
          </div>

          <CardContent className="p-0 flex-1 overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Cargando inventario de productos...</div>
            ) : filteredProductos.length === 0 ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                <UtensilsCrossed className="h-8 w-8 text-slate-300" />
                <p className="font-bold">No se encontraron platos</p>
                <p className="text-xs">Prueba con otra búsqueda o categoría</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider border-b border-slate-100">
                    <th className="py-4 px-6">Plato</th>
                    <th className="py-4 px-6">Categoría</th>
                    <th className="py-4 px-6">Precio (€)</th>
                    <th className="py-4 px-6 text-center">Estado de Stock</th>
                    <th className="py-4 px-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProductos.map(producto => (
                    <tr 
                      key={producto.id} 
                      className={`hover:bg-slate-50/50 transition-colors ${!producto.disponible ? 'bg-slate-50/30' : ''}`}
                    >
                      {/* Plato */}
                      <td className="py-4 px-6 flex items-center gap-3">
                        <img 
                          src={producto.imagen_url} 
                          alt={producto.nombre} 
                          className="w-12 h-12 object-cover rounded-xl border border-slate-100 shadow-sm shrink-0" 
                        />
                        <span className={`font-bold text-sm text-slate-800 ${!producto.disponible ? 'text-slate-400 line-through' : ''}`}>
                          {producto.nombre}
                        </span>
                      </td>

                      {/* Categoria */}
                      <td className="py-4 px-6">
                        <Badge className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold capitalize text-[10px] px-2 py-0.5 rounded-md border-0">
                          {producto.categoria}
                        </Badge>
                      </td>

                      {/* Precio */}
                      <td className="py-4 px-6 font-bold text-sm text-slate-800">
                        {editingPriceId === producto.id ? (
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="number"
                              step="0.01"
                              value={tempPrice}
                              onChange={(e) => setTempPrice(e.target.value)}
                              className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#005BB7] focus:outline-none"
                            />
                            <Button 
                              size="icon" 
                              onClick={() => savePrice(producto.id)}
                              className="h-7 w-7 bg-[#00C853] hover:bg-[#00E676] rounded-lg p-0"
                            >
                              <Check className="h-3.5 w-3.5 text-white" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => setEditingPriceId(null)}
                              className="h-7 w-7 text-slate-400 hover:bg-slate-100 rounded-lg p-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span>{producto.precio.toFixed(2)}€</span>
                            <button 
                              onClick={() => handleEditPrice(producto)}
                              className="text-blue-500 hover:text-blue-600 text-xs font-bold underline opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Editar
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-4 px-6 text-center">
                        <Badge className={`font-black text-[10px] px-2.5 py-1 rounded-full border-0 ${
                          producto.disponible 
                            ? 'bg-emerald-50 text-[#00C853]' 
                            : 'bg-amber-50 text-amber-500'
                        }`}>
                          {producto.disponible ? 'Disponible' : 'Agotado'}
                        </Badge>
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-6 text-right">
                        <Button
                          onClick={() => toggleAvailability(producto.id, producto.disponible)}
                          variant="outline"
                          className={`text-xs font-black px-4 py-1.5 rounded-xl border ${
                            producto.disponible
                              ? 'text-amber-600 hover:text-white bg-white hover:bg-amber-500 border-amber-200 hover:border-amber-500'
                              : 'text-emerald-600 hover:text-white bg-white hover:bg-emerald-500 border-emerald-200 hover:border-emerald-500'
                          }`}
                        >
                          {producto.disponible ? 'Marcar Agotado' : 'Habilitar Stock'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
