import { SeleccionRecompensa } from '../recompensa/recompensa.model';

export interface ItemBorrador {
    id: number;
    cantidad: number;
}

export interface BorradorCompra {
    tipoCompra?: 'entradas' | 'candy';
    usuarioId?: string | null;
    solicitudId?: string;
    recompensas?: SeleccionRecompensa[];
    puntosUsados?: number;
    proyeccion?: {
        peliculaId: number;
        proyeccionId: number;
        fecha: string;
        horario: string;
        formato: string;
        idioma: string;
        salaId: number;
    };
    cantidadEntradas: number;
    entradas?: {
        precio_unitario: number;
        medio_pago: 'dinero' | 'puntos';
        puntos_usados: number;
        recompensa_id?: number;
    }[];
    productos: ItemBorrador[];
    combos: ItemBorrador[];
    cupon?: { codigo?: string; porcentaje_descuento?: number } | null;
    subtotal: number;
    total: number;
    puntosEstimados: number;
    butacaProyeccionIds?: number[];
    butacasSeleccionadas?: string[];
    recargoButacasVip?: number;
}
