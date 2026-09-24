import { Injectable } from '@angular/core';
import { PeliculaRepository } from './pelicula.repository';
import { PeliculaInput, Pelicula } from './pelicula.model';
import { SupabaseService } from '../services/supabase.service';

@Injectable({ providedIn: 'root' })
export class SupabasePeliculaAdapter implements PeliculaRepository {
    constructor(private supabaseService: SupabaseService) { }

    async listar(): Promise<Pelicula[]> {
        const supabase = this.supabaseService.supabaseClient;

        const { data, error } = await supabase
            .from('pelicula')
            .select()
            .order('nombre', { ascending: true });

        if (error) {
            throw new Error(`Error al listar las películas: ${error.message}`);
        }

        return data as Pelicula[];
    }

    async crear(datos: PeliculaInput): Promise<Pelicula> {
        const supabase = this.supabaseService.supabaseClient;

        const { data, error } = await supabase
            .from('pelicula')
            .insert(datos)
            .select()
            .single();

        if (error) {
            throw new Error(`Error al crear la película: ${error.message}`);
        }

        return data as Pelicula;
    }

    async actualizar(id: number, datos: PeliculaInput): Promise<Pelicula> {
        const supabase = this.supabaseService.supabaseClient;

        const { data, error } = await supabase
            .from('pelicula')
            .update(datos)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Error al actualizar la película: ${error.message}`);
        }

        return data as Pelicula;
    }

    async cambiarActiva(id: number, activa: boolean): Promise<void> {
        const supabase = this.supabaseService.supabaseClient;

        const { error } = await supabase
            .from('pelicula')
            .update({ activa })
            .eq('id', id);

        if (error) {
            throw new Error(`Error al cambiar el estado de la película: ${error.message}`);
        }
    }
}