export type MedioPagoCompra = 'dinero' | 'puntos';

export type EstadoCompra = string;

export interface Compra {
    id: string;
    usuario_id: string | null;
    proyeccion_id: number;
    fecha_compra: string | null;
    estado: EstadoCompra | null;
    total: number;
    creditos_usados: number | null;
    codigo_qr: string | null;
    url_pdf: string | null;
    puntos_generados: number;
}

export type CompraInput = Omit<
    Compra,
    'id' | 'fecha_compra' | 'codigo_qr' | 'url_pdf'
> & {
    id?: string;
    fecha_compra?: string | null;
    codigo_qr?: string | null;
    url_pdf?: string | null;
};
