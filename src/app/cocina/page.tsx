'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, PlayCircle } from 'lucide-react';

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

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // update every minute for elapsed time
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

    // Suscripción a cambios
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

  const renderColumn = (titulo: string, estado: string) => {
    const tickets = comandas.filter(c => c.estado === estado);
    
    return (
      <div className="flex-1 min-w-[300px] max-w-[450px] bg-slate-200/50 p-4 rounded-2xl shadow-inner flex flex-col h-full max-h-screen">
        <h2 className="text-xl font-bold mb-4 flex justify-between items-center text-slate-800 shrink-0">
          {titulo}
          <Badge variant="secondary" className="text-lg bg-white px-3">{tickets.length}</Badge>
        </h2>
        <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
          {tickets.map(ticket => {
            const elapsed = getElapsedTime(ticket.created_at);
            const isUrgent = estado === 'pendiente' && elapsed >= 15;
            
            return (
              <Card key={ticket.id} className={`border-l-4 shadow-md ${isUrgent ? 'border-l-[#FF3D00] animate-pulse bg-red-50' : 'border-l-[#005BB7] bg-white'}`}>
                <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg font-bold">Mesa {ticket.mesa_id}</CardTitle>
                  <div className={`flex items-center text-sm font-medium ${isUrgent ? 'text-[#FF3D00]' : 'text-slate-500'}`}>
                    <Clock className="w-4 h-4 mr-1" />
                    {elapsed} min
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-2">
                  <ul className="space-y-2 mt-2">
                    {ticket.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-start text-sm border-b border-slate-100 pb-1">
                        <div>
                          <span className="font-bold mr-2">{item.cantidad}x</span>
                          <span>{item.nombre}</span>
                          {item.notas && <p className="text-xs text-slate-500 italic ml-6 mt-1">&quot;{item.notas}&quot;</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="px-4 pb-4 pt-2 flex justify-end gap-2">
                  {estado === 'pendiente' && (
                    <Button onClick={() => updateEstado(ticket.id, 'preparando')} className="w-full bg-[#005BB7] hover:bg-[#004A99]">
                      <PlayCircle className="w-4 h-4 mr-2" /> Preparar
                    </Button>
                  )}
                  {estado === 'preparando' && (
                    <Button onClick={() => updateEstado(ticket.id, 'listo')} className="w-full bg-[#00C853] hover:bg-green-600">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Listo para Servir
                    </Button>
                  )}
                  {estado === 'listo' && (
                    <div className="w-full text-center text-sm text-green-600 font-bold p-2 bg-green-50 rounded-md">
                      Esperando al Runner...
                    </div>
                  )}
                </CardFooter>
              </Card>
            );
          })}
          {tickets.length === 0 && (
            <div className="text-center text-slate-400 py-8 italic border-2 border-dashed border-slate-300 rounded-lg">
              No hay tickets
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-md shrink-0">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">JaénTap - Muro de Cocina</h1>
          <div className="flex items-center gap-4">
             <Badge variant="outline" className="text-white border-white/20 px-4 py-1">
                {comandas.length} Pedidos Activos
             </Badge>
          </div>
        </div>
      </header>
      
      <main className="flex-1 p-4 md:p-6 overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-6 h-full overflow-x-auto pb-4 custom-scrollbar">
          {renderColumn('PENDIENTES', 'pendiente')}
          {renderColumn('EN PREPARACIÓN', 'preparando')}
          {renderColumn('LISTOS PARA SERVIR', 'listo')}
        </div>
      </main>
    </div>
  );
}
