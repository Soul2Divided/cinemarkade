import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { Resena, ResenaInput } from './resena.model';
import { ResenaRepository } from './resena.repository';

@Injectable({ providedIn: 'root' })
export class SupabaseResenaAdapter implements ResenaRepository {
    constructor(private readonly supabaseService: SupabaseService) {}

    private get cliente() {
        return this.supabaseService.supabaseClient;
    }

    async listarPorPelicula(peliculaId: number): Promise<Resena[]> {
        const { data, error } = await this.cliente
            .from('resena_detalle')
            .select('*')
            .eq('pelicula_id', peliculaId)
            .order('fecha', { ascending: false })
            .order('id', { ascending: false });

        if (error) {
            throw this.errorOperacion('No pudimos cargar las reseñas. Intentá nuevamente.', error);
        }

        return data ?? [];
    }

    async listarPropias(): Promise<Resena[]> {
        const usuarioId = await this.obtenerUsuarioId();
        const { data, error } = await this.cliente
            .from('resena_detalle')
            .select('*')
            .eq('usuario_id', usuarioId)
            .order('fecha', { ascending: false })
            .order('id', { ascending: false });

        if (error) {
            throw this.errorOperacion('No pudimos cargar tus reseñas. Intentá nuevamente.', error);
        }

        return data ?? [];
    }

    async crear(peliculaId: number, datos: ResenaInput): Promise<Resena> {
        const usuarioId = await this.obtenerUsuarioId();
        const { data, error } = await this.cliente
            .from('resena')
            .insert({
                pelicula_id: peliculaId,
                usuario_id: usuarioId,
                estrellas: datos.estrellas,
                comentario: datos.comentario,
            })
            .select('id')
            .single();

        if (error) {
            if (error.code === '23505') {
                throw new Error(
                    'Ya publicaste una reseña de esta película. Recargá la lista para editarla.',
                );
            }

            throw this.errorOperacion('No pudimos publicar tu reseña. Intentá nuevamente.', error);
        }

        return this.obtenerDetalle(data.id);
    }

    async actualizar(id: number, datos: ResenaInput): Promise<Resena> {
        const usuarioId = await this.obtenerUsuarioId();
        const { error } = await this.cliente
            .from('resena')
            .update({ estrellas: datos.estrellas, comentario: datos.comentario })
            .eq('id', id)
            .eq('usuario_id', usuarioId)
            .select('id')
            .single();

        if (error) {
            throw this.errorOperacion('No pudimos guardar los cambios. Intentá nuevamente.', error);
        }

        return this.obtenerDetalle(id);
    }

    async eliminar(id: number): Promise<void> {
        const usuarioId = await this.obtenerUsuarioId();
        const { error } = await this.cliente
            .from('resena')
            .delete()
            .eq('id', id)
            .eq('usuario_id', usuarioId)
            .select('id')
            .single();

        if (error) {
            throw this.errorOperacion('No pudimos eliminar tu reseña. Intentá nuevamente.', error);
        }
    }

    private async obtenerDetalle(id: number): Promise<Resena> {
        const { data, error } = await this.cliente
            .from('resena_detalle')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            throw this.errorOperacion(
                'Tu reseña se guardó, pero no pudimos mostrarla. Recargá la lista.',
                error,
            );
        }

        return data;
    }

    private async obtenerUsuarioId(): Promise<string> {
        const { data, error } = await this.cliente.auth.getUser();

        if (error || !data.user) {
            throw new Error('Iniciá sesión para administrar tus reseñas.');
        }

        return data.user.id;
    }

    private errorOperacion(mensaje: string, detalle: unknown): Error {
        console.error(mensaje, detalle);

        return new Error(mensaje);
    }
}
