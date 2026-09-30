import { Injectable } from '@angular/core';
import { FuncionRepository } from './funcion.repository';
import { Funcion, FuncionInput } from './funcion.model';
import { SupabaseService } from '../services/supabase.service';

@Injectable({ providedIn: 'root' })
export class SupabaseFuncionAdapter implements FuncionRepository {
    constructor(private supabaseService: SupabaseService) { }

    async listar(): Promise<Funcion[]> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('funcion')
            .select()
            .order('fecha', { ascending: true })
            .order('horario', { ascending: true });

        if (error) {
            throw new Error(`Error al listar las funciones: ${error.message}`);
        }

        return data as Funcion[];
    }

    async obtenerPorId(id: number): Promise<Funcion> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('funcion')
            .select()
            .eq('id', id)
            .single();

        if (error) {
            throw new Error(`Error al obtener la función: ${error.message}`);
        }

        return data as Funcion;
    }

    async listarPorPelicula(peliculaId: number): Promise<Funcion[]> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('funcion')
            .select()
            .eq('pelicula_id', peliculaId)
            .order('fecha', { ascending: true })
            .order('horario', { ascending: true });

        if (error) {
            throw new Error(
                `Error al listar las funciones de la película: ${error.message}`
            );
        }

        return data as Funcion[];
    }

    async crear(datos: FuncionInput): Promise<Funcion> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('funcion')
            .insert(datos)
            .select()
            .single();

        if (error) {
            throw new Error(`Error al crear la función: ${error.message}`);
        }

        return data as Funcion;
    }

    async actualizar(id: number, datos: FuncionInput): Promise<Funcion> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('funcion')
            .update(datos)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Error al actualizar la función: ${error.message}`);
        }

        return data as Funcion;
    }

    async cambiarActiva(id: number, activa: boolean): Promise<void> {
        const { error } = await this.supabaseService.supabaseClient
            .from('funcion')
            .update({ activa })
            .eq('id', id);

        if (error) {
            throw new Error(
                `Error al cambiar el estado de la función: ${error.message}`
            );
        }
    }

    async existeFuncionActivaEnSala(
        salaId: number,
        excluirFuncionId?: number
    ): Promise<boolean> {
        let query = this.supabaseService.supabaseClient
            .from('funcion')
            .select('id', { count: 'exact', head: true })
            .eq('sala_id', salaId)
            .eq('activa', true);

        if (excluirFuncionId !== undefined) {
            query = query.neq('id', excluirFuncionId);
        }

        const { count, error } = await query;

        if (error) {
            throw new Error(
                `Error al verificar la disponibilidad de la sala: ${error.message}`
            );
        }

        return (count ?? 0) > 0;
    }
}