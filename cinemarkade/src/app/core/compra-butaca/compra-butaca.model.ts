import { MedioPagoCompra } from '../compra/compra.model';

export interface CompraButaca {
    id: number;
    compra_id: string | null;
    butaca_proyeccion_id: number | null;
    medio_pago: MedioPagoCompra | null;
    precio_unitario: number | null;
    puntos_usados: number | null;
}

export type CompraButacaInput = Omit<CompraButaca, 'id'>;
