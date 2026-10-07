import { MedioPagoCompra } from '../compra/compra.model';

export type TipoItemCompra = 'producto' | 'combo';

export interface DetalleCompra {
    id: number;
    compra_id: string | null;
    producto_id: number | null;
    combo_id: number | null;
    tipo_item: TipoItemCompra | null;
    nombre_item: string | null;
    cantidad: number | null;
    precio_unitario: number | null;
    medio_pago: MedioPagoCompra | null;
    puntos_usados: number | null;
    puntos_generados: number | null;
}

export type DetalleCompraInput = Omit<DetalleCompra, 'id'>;
