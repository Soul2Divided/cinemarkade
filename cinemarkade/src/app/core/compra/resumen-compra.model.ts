import { BorradorCompra } from './borrador-compra.model';

export interface DatosEntradaCompra {
    pelicula: string;
    fecha: string;
    horario: string;
    sala: number;
    formato: string;
    idioma: string;
    cantidadEntradas: number;
    butacas: string[];
}

export interface LineaResumenCompra {
    id: number;
    nombre: string;
    cantidad: number;
    importe: number;
}

export interface TotalesResumenCompra {
    total: number;
    puntos: number;
    recargoVip: number;
    cupon: BorradorCompra['cupon'];
}

export interface ResumenCompra {
    entrada: DatosEntradaCompra | null;
    productos: LineaResumenCompra[];
    recompensas: LineaResumenCompra[];
    totales: TotalesResumenCompra;
}
