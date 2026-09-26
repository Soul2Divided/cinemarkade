import { Injectable } from '@angular/core';
import { FuncionRepository } from './funcion.repository';
import { FuncionInput, Funcion } from './funcion.model';
import { SupabaseService } from '../services/supabase.service';

@Injectable({ providedIn: 'root' })
export class SupabaseFuncionAdapter implements FuncionRepository {
    constructor(private supabaseService: SupabaseService) { }

    async listar(): Promise<Funcion[]> {
        const supabase = this.supabaseService.supabaseClient;

        const { data, error } = await supabase
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
        const supabase = this.supabaseService.supabaseClient;

        const { data, error } = await supabase
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
        const supabase = this.supabaseService.supabaseClient;

        const { data, error } = await supabase
            .from('funcion')
            .select()
            .eq('pelicula_id', peliculaId)
            .order('fecha', { ascending: true })
            .order('horario', { ascending: true });

        if (error) {
            throw new Error(`Error al listar las funciones de la película: ${error.message}`);
        }

        return data as Funcion[];
    }

    async crearMuchas(funciones: FuncionInput[]): Promise<Funcion[]> {
        const supabase = this.supabaseService.supabaseClient;

        const { data, error } = await supabase
            .from('funcion')
            .insert(funciones)
            .select();

        if (error) {
            throw new Error(`Error al crear las funciones: ${error.message}`);
        }

        return data as Funcion[];
    }

    async eliminar(id: number): Promise<void> {
        const supabase = this.supabaseService.supabaseClient;

        const { error } = await supabase
            .from('funcion')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Error al eliminar la función: ${error.message}`);
        }
    }
}