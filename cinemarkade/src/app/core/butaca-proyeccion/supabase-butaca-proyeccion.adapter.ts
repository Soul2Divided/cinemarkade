import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { ButacaProyeccionVista, EstadoButaca } from './butaca-proyeccion.model';
import { ButacaProyeccionRepository } from './butaca-proyeccion.repository';

@Injectable({ providedIn: 'root' })
export class SupabaseButacaProyeccionAdapter implements ButacaProyeccionRepository {
    constructor(private readonly supabaseService: SupabaseService) {}

    async listarPorProyeccion(proyeccionId: number): Promise<ButacaProyeccionVista[]> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('butaca_proyeccion')
            .select('id, proyeccion_id, butaca_id, estado, butaca(*)')
            .eq('proyeccion_id', proyeccionId)
            .order('id', { ascending: true });

        if (error) {
            throw new Error(`Error al listar las butacas de la proyección: ${error.message}`);
        }

        return (data ?? []).map(registro => ({
            ...registro,
            estado: registro.estado as EstadoButaca | null,
            butaca: registro.butaca as unknown as ButacaProyeccionVista['butaca'],
        })) as ButacaProyeccionVista[];
    }
}
