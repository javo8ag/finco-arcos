import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Portafolios disponibles en el sistema
export const PORTAFOLIOS = [
  { id: null,             nombre: 'Consolidado',    descripcion: 'Todos los portafolios', color: '#2d43d0' },
  { id: 'Finco Arcos',    nombre: 'Finco Arcos',    descripcion: 'Cartera propia',        color: '#02106c' },
  { id: 'Monarca Capital',nombre: 'Monarca Capital', descripcion: 'Family office',         color: '#ff7900' },
]

export const usePortafolioStore = create(
  persist(
    (set, get) => ({
      portafolioActivo: null, // null = consolidado (todos)

      setPortafolio: (id) => set({ portafolioActivo: id }),

      getPortafolioInfo: () =>
        PORTAFOLIOS.find(p => p.id === get().portafolioActivo) ?? PORTAFOLIOS[0],

      // Para queries: devuelve el filtro o undefined si es consolidado
      getFiltroPortafolio: () => get().portafolioActivo ?? undefined,
    }),
    { name: 'finco-portafolio' }
  )
)
