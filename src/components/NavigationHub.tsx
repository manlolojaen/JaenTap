'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { 
  LayoutGrid, 
  ChefHat, 
  Truck, 
  ShieldCheck, 
  X, 
  Sparkles,
  ChevronRight,
  Utensils
} from 'lucide-react';

export default function NavigationHub() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeMesa, setActiveMesa] = useState(1);

  useEffect(() => {
    const m = searchParams.get('mesa');
    if (m) {
      setActiveMesa(parseInt(m));
    }
  }, [searchParams]);

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  const handleChangeMesa = (mesa: number) => {
    setActiveMesa(mesa);
    setIsOpen(false);
    router.push(`/?mesa=${mesa}`);
  };

  const isClientView = pathname === '/';
  const isCocinaView = pathname === '/cocina';
  const isRunnerView = pathname === '/runner';
  const isAdminView = pathname === '/administracion';

  return (
    <>
      {/* FLOATING ACTION BUTTON */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-[#005BB7] to-[#0083B0] text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 border border-white/20 flex items-center justify-center group"
        title="Abrir Selector de Vistas"
        id="nav-hub-trigger"
      >
        <LayoutGrid className="h-6 w-6 group-hover:rotate-45 transition-transform duration-300" />
        <span className="absolute right-16 bg-slate-900/90 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap backdrop-blur-sm pointer-events-none">
          Menú de Navegación
        </span>
      </button>

      {/* DRAWER / BACKDROP */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 animate-fade-in">
          {/* Back Drop */}
          <div 
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
          ></div>

          {/* Modal Content */}
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-slide-up sm:animate-scale-in">
            {/* Cabecera */}
            <div className="bg-gradient-to-r from-[#005BB7] to-[#0083B0] text-white p-5 flex justify-between items-center relative">
              <div className="flex items-center gap-2.5">
                <div className="bg-white/10 p-2 rounded-xl">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-lg tracking-tight">JaénTap Hub</h3>
                  <p className="text-[10px] text-blue-100 font-medium">Selector de Vistas & Acceso Rápido</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-xl text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Opciones */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              
              {/* SECCIÓN TRABAJO / ROLES */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Roles y Espacios de Trabajo</p>
                <div className="flex flex-col gap-2.5">
                  {/* CLIENTE */}
                  <button
                    onClick={() => handleNavigate(`/?mesa=${activeMesa}`)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                      isClientView 
                        ? 'bg-blue-50/50 border-[#005BB7] text-[#005BB7]' 
                        : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${isClientView ? 'bg-[#005BB7] text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Utensils className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm">Carta Digital (Cliente)</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Vista del comensal en mesa</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>

                  {/* COCINA */}
                  <button
                    onClick={() => handleNavigate('/cocina')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                      isCocinaView 
                        ? 'bg-blue-50/50 border-[#005BB7] text-[#005BB7]' 
                        : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${isCocinaView ? 'bg-[#005BB7] text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <ChefHat className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm">Muro de Cocina (Chef)</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Kanban de comandas en tiempo real</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>

                  {/* RUNNER */}
                  <button
                    onClick={() => handleNavigate('/runner')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                      isRunnerView 
                        ? 'bg-blue-50/50 border-[#005BB7] text-[#005BB7]' 
                        : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${isRunnerView ? 'bg-[#005BB7] text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm">Runner / Sala (Entregas)</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Panel táctil de camarero y reparto</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>

                  {/* ADMIN */}
                  <button
                    onClick={() => handleNavigate('/administracion')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                      isAdminView 
                        ? 'bg-blue-50/50 border-[#005BB7] text-[#005BB7]' 
                        : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${isAdminView ? 'bg-[#005BB7] text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm">Administración (Inventario)</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Precios, stock y control de ventas</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* SECTOR SELECCIÓN DE MESA (CLIENTE) */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Selector de Mesa</p>
                <div className="grid grid-cols-4 gap-2.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(m => {
                    const isMesaActive = activeMesa === m && isClientView;
                    return (
                      <button
                        key={m}
                        onClick={() => handleChangeMesa(m)}
                        className={`py-2 rounded-xl text-xs font-black transition-all border ${
                          isMesaActive
                            ? 'bg-[#005BB7] border-[#005BB7] text-white shadow-lg shadow-blue-100 scale-105'
                            : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100 text-slate-700'
                        }`}
                      >
                        Mesa {m}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
