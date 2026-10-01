export interface Cupon {
    id: number;
    codigo: string;
    porcentaje_descuento: number;
    edad_minima: number;
    fecha_inicio: string;
    fecha_fin: string;
    activa: boolean;
}

export type CuponInput = Omit<Cupon, 'id' | 'activa'>;