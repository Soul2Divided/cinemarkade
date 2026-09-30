/** Modelo de dominio del cupón, con nombres legibles para Angular. */
export interface Cupon {
    id: number;
    codigo: string;
    porcentajeDescuento: number;
    edadMinima: number;
    fechaInicio: string;
    fechaFin: string;
}

/** Datos editables; el identificador lo asigna la base de datos. */
export type CuponInput = Omit<Cupon, 'id'>;

/** Forma de la fila en Supabase (tabla `cupon`). */
export interface CuponRow {
    id: number;
    codigo: string;
    porcentaje_descuento: number;
    edad_minima: number;
    fecha_inicio: string;
    fecha_fin: string;
}
