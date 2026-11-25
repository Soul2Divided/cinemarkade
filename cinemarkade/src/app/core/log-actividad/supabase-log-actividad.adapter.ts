import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { LogActividad, RegistrarLogActividadInput } from './log-actividad.model';
import { LogActividadRepository } from './log-actividad.repository';

interface LogActividadFila extends Omit<LogActividad, 'usuario_nombre'> {
    usuario: {
        nombre: string | null;
        apellido: string | null;
    } | null;
}

@Injectable({ providedIn: 'root' })
export class SupabaseLogActividadAdapter implements LogActividadRepository {
    private readonly client = inject(SupabaseService).supabaseClient;

    async registrar(datos: RegistrarLogActividadInput): Promise<void> {
        const { error } = await this.client.from('log_actividad').insert({
            usuario_id: datos.usuario_id,
            accion: datos.accion,
            detalle: datos.detalle,
            fecha_hora: datos.fecha_hora,
        });

        if (error) {
            throw new Error(error.message);
        }
    }

    async listar(): Promise<LogActividad[]> {
        const { data, error } = await this.client
            .from('log_actividad')
            .select(`
                id,
                usuario_id,
                accion,
                detalle,
                fecha_hora,
                usuario:usuario!log_actividad_usuario_id_fkey (
                    nombre,
                    apellido
                )
            `)
            .order('fecha_hora', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return ((data ?? []) as unknown as LogActividadFila[]).map((fila) => ({
            id: fila.id,
            usuario_id: fila.usuario_id,
            accion: fila.accion,
            detalle: fila.detalle,
            fecha_hora: fila.fecha_hora,
            usuario_nombre: [fila.usuario?.nombre, fila.usuario?.apellido]
                .filter(Boolean)
                .join(' ') || 'Usuario desconocido',
        }));
    }
}
