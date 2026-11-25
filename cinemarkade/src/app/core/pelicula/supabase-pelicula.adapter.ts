import { Injectable } from '@angular/core';
import { PeliculaRepository } from './pelicula.repository';
import { PeliculaInput, Pelicula, VentasPelicula } from './pelicula.model';
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

    async obtenerPorId(id: number): Promise<Pelicula> {
        const supabase = this.supabaseService.supabaseClient;

        const { data, error } = await supabase
            .from('pelicula')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            throw new Error(`Error obtener la película: ${error.message}`);
        }

        return data as Pelicula;
    }

    async obtenerVentasPorPelicula(): Promise<VentasPelicula[]> {
        const cliente = this.supabaseService.supabaseClient;
        const { data, error } = await cliente
            .from('ranking_peliculas_publico')
            .select('pelicula_id, entradas_vendidas')
            .order('entradas_vendidas', { ascending: false });

        if (error) {
            throw new Error(`No se pudo consultar el ranking de películas: ${error.message}`);
        }

        return (data ?? []) as VentasPelicula[];
    }
}
