'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, UtensilsCrossed } from 'lucide-react';

interface ComandaItem {
  producto_id: string;
  nombre: string;
  cantidad: number;
}

interface Comanda {
  id: string;
  mesa_id: number;
  items: ComandaItem[];
  estado: string;
}

export default function VistaRunner() {
  const [comandas, setComandas] = useState<Comanda[]>([]);

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
      alert('Error: ' + error.message);
    } else {
      setComandas(curr => curr.filter(c => c.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-[#00C853] text-white p-4 shadow-md sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center">
            <UtensilsCrossed className="mr-2" />
            JaénTap - Runner
          </h1>
          <div className="bg-white text-[#00C853] font-bold px-3 py-1 rounded-full text-sm">
            {comandas.length} Listos
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {comandas.length === 0 ? (
            <div className="col-span-full text-center p-12 bg-white rounded-2xl shadow-sm text-slate-500 mt-8 border-2 border-dashed border-slate-200">
              <UtensilsCrossed className="w-16 h-16 mx-auto mb-4 opacity-20 text-[#00C853]" />
              <p className="text-xl font-bold text-slate-700">No hay pedidos listos</p>
              <p className="text-slate-400 mt-2">¡Todo al día en sala!</p>
            </div>
          ) : (
            comandas.map((ticket) => (
              <Card key={ticket.id} className="border-t-8 border-t-[#00C853] shadow-lg hover:shadow-xl transition-all rounded-2xl overflow-hidden flex flex-col h-full">
                <CardHeader className="bg-green-50/50 pb-4 border-b border-green-100">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-3xl font-black text-[#005BB7]">
                      MESA {ticket.mesa_id}
                    </CardTitle>
                    <Badge className="bg-[#00C853] text-white">LISTO</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 flex-1">
                  <ul className="space-y-4">
                    {ticket.items.map((item, idx) => (
                      <li key={idx} className="flex items-start text-lg">
                        <span className="font-bold bg-slate-100 text-slate-700 w-9 h-9 rounded-full flex items-center justify-center mr-3 shrink-0 border border-slate-200">
                          {item.cantidad}
                        </span>
                        <span className="font-semibold text-slate-800 pt-1 leading-tight">{item.nombre}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-2 pb-6 px-6">
                  <Button 
                    className="w-full h-20 text-2xl font-black bg-[#00C853] hover:bg-green-600 shadow-lg shadow-green-100 rounded-xl group transition-all"
                    onClick={() => marcarEntregado(ticket.id)}
                  >
                    <Check className="w-8 h-8 mr-3 group-hover:scale-125 transition-transform" /> ENTREGADO
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
