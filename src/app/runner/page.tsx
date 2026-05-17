'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, UtensilsCrossed, Clock, BellRing } from 'lucide-react';

interface ComandaItem {
  producto_id: string;
  nombre: string;
  cantidad: number;
  notas?: string;
}

interface Comanda {
  id: string;
  mesa_id: number;
  items: ComandaItem[];
  estado: string;
  finished_at?: string;
}

export default function VistaRunner() {
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchComandas = async () => {
      const { data, error } = await supabase
        .from('comandas')
        .select('*')
        .eq('estado', 'listo')
        .order('finished_at', { ascending: true });
      
      if (!error && data) {
        setComandas(data);
      }
    };

    fetchComandas();

    // Realtime subscription for runner view
    const channel = supabase
      .channel('public:runner_comandas')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comandas', filter: 'estado=eq.listo' }, (payload) => {
        setComandas((curr) => {
          const exists = curr.find(c => c.id === payload.new.id);
          if (!exists) return [...curr, payload.new as Comanda];
          return curr;
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comandas', filter: 'estado=eq.entregado' }, (payload) => {
        setComandas((curr) => curr.filter(c => c.id !== payload.new.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const marcarEntregado = async (id: string) => {
    const { error } = await supabase
      .from('comandas')
      .update({ estado: 'entregado' })
      .eq('id', id);
    
    if (error) {
      alert('Error al entregar comanda: ' + error.message);
    } else {
      setComandas(curr => curr.filter(c => c.id !== id));
    }
  };

  const getElapsedReadyTime = (finished_at?: string) => {
    if (!finished_at) return 0;
    const diff = Math.floor((now.getTime() - new Date(finished_at).getTime()) / 60000);
    return diff >= 0 ? diff : 0;
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 pb-12 flex flex-col">
      {/* HEADER PREMIUM */}
      <header className="bg-gradient-to-r from-[#00C853] to-[#128C7E] text-white py-4 px-4 sm:px-6 shadow-lg sticky top-0 z-20 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 p-2 rounded-xl text-white backdrop-blur-sm border border-white/10 animate-bounce">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight leading-none">JaénTap - Runner</h1>
              <p className="text-xs text-green-100 font-bold mt-1">Servicio de Sala e Historial</p>
            </div>
          </div>
          <Badge className="bg-white text-[#128C7E] font-black px-4 py-1.5 rounded-full border border-white/20 text-xs sm:text-sm shadow-md flex items-center gap-1.5 animate-pulse">
            <BellRing className="w-4 h-4 text-[#00C853]" />
            {comandas.length} por entregar
          </Badge>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Comandas Listas</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Recoge los platos de la barra de cocina y llévalos inmediatamente a las mesas correspondientes.</p>
        </div>

        {comandas.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-3xl border border-slate-200/60 shadow-sm flex flex-col items-center justify-center max-w-xl mx-auto mt-8">
            <div className="bg-green-50 p-6 rounded-full mb-4 text-[#00C853] animate-pulse">
              <UtensilsCrossed className="w-12 h-12" />
            </div>
            <p className="text-slate-800 font-black text-xl">¡Todo entregado!</p>
            <p className="text-slate-400 text-sm mt-1.5 px-6">La barra de cocina está libre. No hay platos pendientes de reparto a las mesas en este momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {comandas.map((ticket) => {
              const elapsed = getElapsedReadyTime(ticket.finished_at);
              const isUrgent = elapsed >= 5; // Urgent if waiting on counter for more than 5 minutes
              
              return (
                <Card 
                  key={ticket.id} 
                  className={`group border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden flex flex-col h-full ${
                    isUrgent ? 'ring-2 ring-red-500 bg-red-50/5' : 'bg-white'
                  }`}
                >
                  {/* Encabezado de la mesa */}
                  <CardHeader className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex flex-row items-center justify-between shrink-0">
                    <div>
                      <CardTitle className="text-3xl font-black tracking-tight text-slate-900 group-hover:text-[#00C853] transition-colors">
                        MESA {ticket.mesa_id}
                      </CardTitle>
                      <div className={`flex items-center text-xs font-black mt-1 px-2.5 py-0.5 rounded-full w-fit ${
                        isUrgent ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-150 text-slate-500 bg-slate-100'
                      }`}>
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        Hace {elapsed} min
                      </div>
                    </div>
                    <Badge className={`font-black tracking-wider text-xs px-3 py-1 rounded-full ${
                      isUrgent ? 'bg-red-500 text-white' : 'bg-[#E8F5E9] text-[#128C7E]'
                    }`}>
                      {isUrgent ? 'URGENTE' : 'LISTO'}
                    </Badge>
                  </CardHeader>

                  {/* Detalle de Platos */}
                  <CardContent className="pt-6 px-5 flex-1 min-h-[150px]">
                    <ul className="space-y-4">
                      {ticket.items.map((item, idx) => (
                        <li key={idx} className="flex items-start text-base border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                          <span className="font-black bg-[#E8F5E9] text-[#128C7E] w-10 h-10 rounded-xl flex items-center justify-center mr-3.5 shrink-0 border border-green-100 text-base shadow-sm">
                            {item.cantidad}
                          </span>
                          <div className="flex-1 pt-1.5">
                            <span className="font-extrabold text-slate-800 leading-snug">{item.nombre}</span>
                            {item.notas && (
                              <div className="mt-1.5 bg-amber-50 border border-amber-200/60 text-amber-800 px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                <span>{item.notas}</span>
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  {/* Botón de acción ultra-táctil */}
                  <CardFooter className="p-4 shrink-0 bg-slate-50/50 border-t border-slate-150">
                    <Button 
                      className="w-full h-16 text-lg font-black bg-[#00C853] hover:bg-green-600 text-white shadow-md hover:shadow-lg rounded-2xl group transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01]"
                      onClick={() => marcarEntregado(ticket.id)}
                    >
                      <Check className="w-6 h-6 mr-1 group-hover:scale-125 transition-transform" /> 
                      MARCAR ENTREGADO
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
