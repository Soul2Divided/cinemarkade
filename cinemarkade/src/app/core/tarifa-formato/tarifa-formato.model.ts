import { FormatoSala } from '../sala/sala.model';

export interface TarifaFormato {
    id: number;
    formato: FormatoSala;
    precio_base: number;
    created_at: string | null;
}

export interface PrecioEntrada {
    formato: FormatoSala;
    precio_base: number;
    precio_final: number;
    descuento_dia_aplicado: boolean;
}
