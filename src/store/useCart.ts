import { create } from 'zustand'

export interface CartItem {
  producto_id: string
  nombre: string
  precio: number
  cantidad: number
  notas: string
}

interface CartStore {
  items: CartItem[]
  mesaId: number | null
  setMesaId: (id: number) => void
  addItem: (item: Omit<CartItem, 'cantidad'>) => void
  removeItem: (producto_id: string, notas: string) => void
  updateItemNota: (producto_id: string, oldNotas: string, newNotas: string) => void
  clearCart: () => void
  getTotal: () => number
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  mesaId: null,
  setMesaId: (id) => set({ mesaId: id }),
  addItem: (newItem) => set((state) => {
    const existing = state.items.find(i => i.producto_id === newItem.producto_id && i.notas === newItem.notas)
    if (existing) {
      return {
        items: state.items.map(i => 
          (i.producto_id === newItem.producto_id && i.notas === newItem.notas) 
            ? { ...i, cantidad: i.cantidad + 1 } 
            : i
        )
      }
    }
    return { items: [...state.items, { ...newItem, cantidad: 1 }] }
  }),
  removeItem: (producto_id, notas) => set((state) => ({
    items: state.items.filter(i => !(i.producto_id === producto_id && i.notas === notas))
  })),
  updateItemNota: (producto_id, oldNotas, newNotas) => set((state) => ({
    items: state.items.map(i => 
      (i.producto_id === producto_id && i.notas === oldNotas) 
        ? { ...i, notas: newNotas } 
        : i
    )
  })),
  clearCart: () => set({ items: [] }),
  getTotal: () => {
    const items = get().items
    return items.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)
  }
}))
