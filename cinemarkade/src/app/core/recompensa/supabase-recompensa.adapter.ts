import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { RecompensaRepository } from './recompensa.repository';
import { CanjeRecompensa, Recompensa, RecompensaInput } from './recompensa.model';

@Injectable({ providedIn: 'root' })
export class SupabaseRecompensaAdapter implements RecompensaRepository {
    private readonly client = inject(SupabaseService).supabaseClient;

    async listar(): Promise<Recompensa[]> {
        const { data, error } = await this.client
            .from('recompensa')
            .select('*')
            .order('id', { ascending: false });

        if (error) {
            throw new Error(`No se pudieron cargar las recompensas: ${error.message}`);
        }

        return data ?? [];
    }

    async guardar(datos: RecompensaInput, id?: number): Promise<void> {
        const { version, ...valores } = datos;
        const query = id
            ? this.client.from('recompensa').update(valores).eq('id', id)
            : this.client.from('recompensa').insert(valores);
        const { error } = await query.select('id').single();

        if (error) {
            throw new Error(`No se pudo guardar la recompensa: ${error.message}`);
        }
    }

    async cambiarEstado(id: number, activa: boolean): Promise<void> {
        const { error } = await this.client
            .from('recompensa')
            .update({ activa })
            .eq('id', id)
            .select('id')
            .single();

        if (error) {
            throw new Error(`No se pudo cambiar el estado: ${error.message}`);
        }
    }

    async historial(): Promise<CanjeRecompensa[]> {
        const { data: session, error: authError } = await this.client.auth.getUser();

        if (authError || !session.user) {
            throw new Error('Iniciá sesión para consultar tus canjes.');
        }

        const { data, error } = await this.client
            .from('canje_recompensa')
            .select('*')
            .eq('usuario_id', session.user.id)
            .order('fecha', { ascending: false });

        if (error) {
            throw new Error(`No se pudo cargar el historial: ${error.message}`);
        }

        return data ?? [];
    }
}
