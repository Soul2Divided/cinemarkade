export type TipoItemCandy = 'producto' | 'combo' | 'recompensa';

export interface SeleccionCandy {
    tipo: TipoItemCandy;
    id: number;
    cantidad: number;
}

export interface LineaCarritoCandy extends SeleccionCandy {
    nombre: string;
    precio: number;
    puntos: number;
    unidades: number;
    disponible: boolean;
}
