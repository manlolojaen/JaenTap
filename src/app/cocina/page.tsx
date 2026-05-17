'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, PlayCircle, AlertTriangle, ChefHat } from 'lucide-react';

interface ComandaItem {
  producto_id: string;
  nombre: string;
  cantidad: number;
  notas: string;
}

interface Comanda {
  id: string;
  mesa_id: number;
  items: ComandaItem[];
  estado: string; // 'pendiente', 'preparando', 'listo', 'entregado'
  created_at: string;
  accepted_at?: string;
}

export default function MuroCocina() {
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [now, setNow] = useState(new Date());
  const [activeColumn, setActiveColumn] = useState<'pendiente' | 'preparando' | 'listo'>('pendiente');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchComandas = async () => {
      const { data, error } = await supabase
        .from('comandas')
        .select('*')
        .in('estado', ['pendiente', 'preparando', 'listo'])
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        setComandas(data);
      }
    };

    fetchComandas();

    // Realtime subscription
    const channel = supabase
      .channel('public:comandas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setComandas((curr) => [...curr, payload.new as Comanda]);
        } else if (payload.eventType === 'UPDATE') {
          setComandas((curr) => {
            const updated = payload.new as Comanda;
            if (updated.estado === 'entregado') {
              return curr.filter(c => c.id !== updated.id);
            }
            return curr.map(c => c.id === updated.id ? updated : c);
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateEstado = async (id: string, nuevoEstado: string) => {
    const updateData: Record<string, string> = { estado: nuevoEstado };
    if (nuevoEstado === 'preparando') {
      updateData.accepted_at = new Date().toISOString();
    } else if (nuevoEstado === 'listo') {
      updateData.finished_at = new Date().toISOString();
    }

    const { error } = await supabase.from('comandas').update(updateData).eq('id', id);
    if (error) console.error('Error updating comanda:', error);
  };

  const getElapsedTime = (created_at: string) => {
    const diff = Math.floor((now.getTime() - new Date(created_at).getTime()) / 60000);
    return diff;
  };

  const renderColumn = (titulo: string, estado: 'pendiente' | 'preparando' | 'listo') => {
    const tickets = comandas.filter(c => c.estado === estado);
    const isActive = activeColumn === estado;
    
    return (
      <div 
        className={`flex-1 min-w-[300px] xl:max-w-[450px] bg-slate-100 rounded-3xl p-5 border border-slate-200/60 shadow-sm flex flex-col h-full ${
          isActive ? 'flex' : 'hidden lg:flex'
        }`}
      >
        <div className="flex justify-between items-center mb-5 shrink-0">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${
              estado === 'pendiente' ? 'bg-[#FF3D00]' : estado === 'preparando' ? 'bg-[#005BB7]' : 'bg-[#00C853]'
            }`}></span>
            {titulo}
          </h2>
          <Badge className={`text-sm font-black px-3 py-0.5 rounded-full ${
            estado === 'pendiente' ? 'bg-[#FF3D00]/10 text-[#FF3D00]' : estado === 'preparando' ? 'bg-[#005BB7]/10 text-[#005BB7]' : 'bg-[#00C853]/10 text-[#00C853]'
          }`}>
            {tickets.length} comandas
          </Badge>
        </div>

        {/* Scroll list */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {tickets.map(ticket => {
            const elapsed = getElapsedTime(ticket.created_at);
            const isRedUrgent = estado === 'pendiente' && elapsed >= 15;
            const isAmberUrgent = estado === 'pendiente' && elapsed >= 10 && elapsed < 15;
            
            let cardStyle = 'border-l-[#005BB7] bg-white';
            if (isRedUrgent) {
              cardStyle = 'border-l-[#FF3D00] bg-red-50/30 ring-1 ring-red-200 animate-pulse';
            } else if (isAmberUrgent) {
              cardStyle = 'border-l-amber-500 bg-amber-50/20 ring-1 ring-amber-200';
            } else if (estado === 'preparando') {
              cardStyle = 'border-l-blue-500 bg-white';
            } else if (estado === 'listo') {
              cardStyle = 'border-l-[#00C853] bg-green-50/10';
            }

            return (
              <Card 
                key={ticket.id} 
                className={`border-t-0 border-r-0 border-b-0 border-l-6 shadow-sm rounded-2xl hover:shadow-md transition-shadow overflow-hidden ${cardStyle}`}
              >
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0 shrink-0">
                  <CardTitle className="text-xl font-black text-slate-800">
                    Mesa {ticket.mesa_id}
                  </CardTitle>
                  <div className={`flex items-center text-xs font-black px-2.5 py-1 rounded-full ${
                    isRedUrgent 
                      ? 'bg-red-100 text-red-600 animate-bounce' 
                      : isAmberUrgent 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    {elapsed} min
                  </div>
                </CardHeader>
                
                <CardContent className="px-4 py-2 flex-1">
                  <ul className="space-y-3">
                    {ticket.items.map((item, idx) => (
                      <li key={idx} className="border-b border-slate-100/60 pb-2 last:border-b-0">
                        <div className="flex justify-between items-start text-base">
                          <div>
                            <span className="font-black text-[#005BB7] text-lg mr-2">{item.cantidad}x</span>
                            <span className="font-extrabold text-slate-800">{item.nombre}</span>
                          </div>
                        </div>
                        {item.notas && (
                          <div className="mt-2 bg-amber-50 border border-amber-200/60 text-amber-800 px-3 py-2 rounded-xl text-xs font-extrabold flex items-start gap-1.5 shadow-sm animate-scale-in">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span>NOTA: &quot;{item.notas}&quot;</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter className="p-4 pt-2 shrink-0">
                  {estado === 'pendiente' && (
                    <Button 
                      onClick={() => updateEstado(ticket.id, 'preparando')} 
                      className="w-full bg-[#005BB7] hover:bg-[#004A99] text-white font-extrabold rounded-xl py-5 shadow-sm transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                    >
                      <PlayCircle className="w-4.5 h-4.5" /> Empezar Cocinado
                    </Button>
                  )}
                  {estado === 'preparando' && (
                    <Button 
                      onClick={() => updateEstado(ticket.id, 'listo')} 
                      className="w-full bg-[#00C853] hover:bg-green-600 text-white font-extrabold rounded-xl py-5 shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                    >
                      <CheckCircle2 className="w-4.5 h-4.5" /> Terminar & Servir
                    </Button>
                  )}
                  {estado === 'listo' && (
                    <div className="w-full text-center text-xs text-green-700 font-extrabold py-3 bg-[#E8F5E9] border border-[#A5D6A7]/40 rounded-xl flex items-center justify-center gap-1.5 shadow-inner">
                      <ChefHat className="w-4 h-4 text-green-600 animate-bounce" />
                      Esperando al Runner...
                    </div>
                  )}
                </CardFooter>
              </Card>
            );
          })}
          {tickets.length === 0 && (
            <div className="text-center text-slate-400 py-16 bg-white rounded-3xl border border-dashed border-slate-300/80 px-4">
              <p className="font-extrabold text-slate-500 text-base">Sin comandas en esta fase</p>
              <p className="text-xs text-slate-400 mt-1">Buen trabajo, mantén el ritmo.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const columnsInfo = [
    { title: 'PENDIENTES', estado: 'pendiente' as const },
    { title: 'EN PREPARACIÓN', estado: 'preparando' as const },
    { title: 'LISTOS PARA SERVIR', estado: 'listo' as const }
  ];

  return (
    <div className="h-screen bg-[#F1F5F9] flex flex-col overflow-hidden text-slate-900">
      {/* HEADER PREMIUM */}
      <header className="bg-slate-900 text-white py-4 px-6 shadow-lg shrink-0 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="bg-[#FF3D00] p-2 rounded-xl text-white">
            <ChefHat className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight leading-none">JaénTap</h1>
            <p className="text-xs text-slate-400 font-bold mt-1">Muro de Control de Cocina en Vivo</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-white/10 hover:bg-white/25 text-white font-extrabold px-4 py-1.5 rounded-full border border-white/10 text-xs sm:text-sm">
            {comandas.length} Comandas Activas
          </Badge>
        </div>
      </header>
      
      {/* SECCIÓN MÓVIL/TABLET DE PESTAÑAS */}
      <div className="lg:hidden p-4 bg-white border-b border-slate-200 shrink-0">
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
          {columnsInfo.map((col) => {
            const count = comandas.filter(c => c.estado === col.estado).length;
            const isColActive = activeColumn === col.estado;
            return (
              <button
                key={col.estado}
                onClick={() => setActiveColumn(col.estado)}
                className={`flex-1 py-3 px-1 rounded-xl text-xs font-black flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
                  isColActive
                    ? 'bg-slate-900 text-white shadow-md scale-[1.01]'
                    : 'text-slate-500 hover:bg-slate-200'
                }`}
              >
                <span>{col.title}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  isColActive ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-4 md:p-6 overflow-hidden min-h-0">
        <div className="flex flex-col lg:flex-row gap-6 h-full w-full overflow-hidden">
          {renderColumn('PENDIENTES', 'pendiente')}
          {renderColumn('EN PREPARACIÓN', 'preparando')}
          {renderColumn('LISTOS PARA SERVIR', 'listo')}
        </div>
      </main>
    </div>
  );
}
