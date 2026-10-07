export type TipoButaca = 'normal' | 'vip' | 'discapacidad';

export interface Butaca {
    id: number;
    sala_id: number | null;
    fila: string | null;
    columna: number | null;
    tipo: TipoButaca | null;
}
