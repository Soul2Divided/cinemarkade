import { Butaca } from '../butaca/butaca.model';

export type EstadoButaca = 'libre' | 'reservada' | 'ocupada';

export interface ButacaProyeccion {
    id: number;
    proyeccion_id: number;
    butaca_id: number;
    estado: EstadoButaca | null;
}

export interface ButacaProyeccionVista extends ButacaProyeccion {
    butaca: Butaca;
}
