import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { Butaca, TipoButaca } from './butaca.model';
import { ButacaRepository } from './butaca.repository';

@Injectable({ providedIn: 'root' })
export class SupabaseButacaAdapter implements ButacaRepository {
    constructor(private readonly supabaseService: SupabaseService) {}

    async listarPorSala(salaId: number): Promise<Butaca[]> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('butaca')
            .select('*')
            .eq('sala_id', salaId)
            .order('fila', { ascending: true })
            .order('columna', { ascending: true });

        if (error) {
            throw new Error(`Error al listar las butacas de la sala: ${error.message}`);
        }

        return (data ?? []).map(butaca => ({
            ...butaca,
            tipo: butaca.tipo as TipoButaca | null,
        })) as Butaca[];
    }
}
