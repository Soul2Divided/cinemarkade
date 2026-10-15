import { CanjeRecompensa, Recompensa, RecompensaInput } from './recompensa.model';

export abstract class RecompensaRepository {
    abstract listar(): Promise<Recompensa[]>;

    abstract guardar(datos: RecompensaInput, id?: number): Promise<void>;

    abstract cambiarEstado(id: number, activa: boolean): Promise<void>;

    abstract historial(): Promise<CanjeRecompensa[]>;
}
