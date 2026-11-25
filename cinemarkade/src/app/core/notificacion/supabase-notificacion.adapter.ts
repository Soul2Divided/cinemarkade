import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { SupabaseService } from '../services/supabase.service';
import { NotificacionUsuario, SuscripcionPushInput } from './notificacion.model';
import { NotificacionRepository } from './notificacion.repository';

@Injectable({ providedIn: 'root' })
export class SupabaseNotificacionAdapter implements NotificacionRepository {
    private readonly supabase = inject(SupabaseService).supabaseClient;
    private readonly swPush = inject(SwPush);

    async suscribirPush(datos: SuscripcionPushInput): Promise<void> {
        if (!this.swPush.isEnabled || !datos.clavePublica) {
            throw new Error('Las notificaciones push no están disponibles en este navegador.');
        }

        const suscripcion = await this.swPush.requestSubscription({
            serverPublicKey: datos.clavePublica,
        });
        const { error } = await this.supabase.from('suscripcion_push').upsert(
            {
                usuario_id: datos.usuarioId,
                endpoint: suscripcion.endpoint,
                suscripcion: suscripcion.toJSON(),
            },
            { onConflict: 'usuario_id,endpoint' },
        );

        if (error) {
            throw new Error(`No se pudo guardar la suscripción push: ${error.message}`);
        }
    }

    async activarRecordatorioEstreno(funcionId: number): Promise<void> {
        const { error } = await this.supabase.rpc('activar_recordatorio_estreno', {
            p_funcion_id: funcionId,
        });

        if (error) {
            throw new Error(error.message);
        }
    }

    async activarRecordatorioPorCompra(proyeccionId: number): Promise<void> {
        const { error } = await this.supabase.rpc('activar_recordatorio_por_compra', {
            p_proyeccion_id: proyeccionId,
        });

        if (error) {
            throw new Error(error.message);
        }
    }

    async listar(): Promise<NotificacionUsuario[]> {
        const { data, error } = await this.supabase
            .from('notificacion_usuario')
            .select(`
                id,
                titulo,
                mensaje,
                creada_en,
                leida_en,
                funcion_id,
                tipo,
                funcion:funcion!notificacion_usuario_funcion_id_fkey (
                    pelicula_id
                )
            `)
            .order('creada_en', { ascending: false });

        if (error) {
            throw new Error(`No se pudieron cargar las notificaciones: ${error.message}`);
        }

        type NotificacionConFuncion = Omit<NotificacionUsuario, 'pelicula_id'> & {
            funcion: { pelicula_id: number | null } | null;
        };

        return ((data ?? []) as unknown as NotificacionConFuncion[]).map(notificacion => ({
            id: notificacion.id,
            titulo: notificacion.titulo,
            mensaje: notificacion.mensaje,
            creada_en: notificacion.creada_en,
            leida_en: notificacion.leida_en,
            funcion_id: notificacion.funcion_id,
            tipo: notificacion.tipo,
            pelicula_id: notificacion.funcion?.pelicula_id ?? null,
        }));
    }

    async marcarLeida(id: string, leidaEn: string): Promise<void> {
        const { error } = await this.supabase
            .from('notificacion_usuario')
            .update({ leida_en: leidaEn })
            .eq('id', id)
            .is('leida_en', null);

        if (error) {
            throw new Error(`No se pudo marcar como leída: ${error.message}`);
        }
    }
}
