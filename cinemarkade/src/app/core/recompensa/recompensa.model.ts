import { FormatoSala } from '../sala/sala.model';

export type TipoRecompensa = 'entrada' | 'producto' | 'combo';

export interface Recompensa {
    id: number;
    nombre: string;
    tipo: TipoRecompensa;
    formato: FormatoSala | null;
    producto_id: number | null;
    combo_id: number | null;
    cantidad: number;
    costo_puntos: number;
    activa: boolean;
    version?: number;
}

export type RecompensaInput = Omit<Recompensa, 'id'>;

export interface SeleccionRecompensa {
    recompensa: Recompensa;
    cantidad: number;
}

export interface CanjeRecompensa {
    id: number;
    compra_id: string;
    nombre: string;
    tipo: TipoRecompensa;
    unidades: number;
    puntos_utilizados: number;
    fecha: string;
    reintegrado: boolean;
}
