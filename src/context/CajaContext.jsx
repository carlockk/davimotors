import { createContext, useContext, useEffect, useState } from 'react';
import { obtenerHistorialCaja } from '../services/api';
import { useAuth } from './AuthContext';

const CajaContext = createContext();

export const useCaja = () => useContext(CajaContext);

export function CajaProvider({ children }) {
  const { selectedLocal } = useAuth();
  const [cajaAbierta, setCajaAbierta] = useState(null);
  const [cajaVerificada, setCajaVerificada] = useState(false);

  useEffect(() => {
    async function verificarCaja() {
      try {
        setCajaVerificada(false);
        const { data } = await obtenerHistorialCaja();
        const abierta = data.find(c => !c.cierre);
        setCajaAbierta(!!abierta);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error al verificar caja en contexto:', error);
        }
      } finally {
        setCajaVerificada(true);
      }
    }

    verificarCaja();
  }, [selectedLocal?._id]);

  return (
    <CajaContext.Provider value={{ cajaAbierta, setCajaAbierta, cajaVerificada }}>
      {children}
    </CajaContext.Provider>
  );
}
