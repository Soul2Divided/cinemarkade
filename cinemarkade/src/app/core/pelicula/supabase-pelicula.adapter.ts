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
        type EntradaConPelicula = {
            compra: {
                estado: string | null;
                proyeccion: {
                    funcion: {
                        pelicula_id: number;
                    } | null;
                } | null;
            } | null;
        };

        const ventasPorPelicula = new Map<number, number>();

        for (let offset = 0; ; offset += 500) {
            const { data, error } = await cliente
                .from('compra_butaca')
                .select(`
                    compra:compra!inner (
                        estado,
                        proyeccion:proyeccion (
                            funcion:funcion (
                                pelicula_id
                            )
                        )
                    )
                `)
                .in('compra.estado', ['confirmada', 'utilizada'])
                .order('id', { ascending: true })
                .range(offset, offset + 499);

            if (error) {
                throw new Error(`No se pudieron consultar las entradas vendidas: ${error.message}`);
            }

            const entradas = (data ?? []) as unknown as EntradaConPelicula[];
            for (const entrada of entradas) {
                const peliculaId = entrada.compra?.proyeccion?.funcion?.pelicula_id;
                if (peliculaId) {
                    ventasPorPelicula.set(
                        peliculaId,
                        (ventasPorPelicula.get(peliculaId) ?? 0) + 1,
                    );
                }
            }

            if (!data || data.length < 500) {
                break;
            }
        }

        return [...ventasPorPelicula.entries()].map(([pelicula_id, entradas_vendidas]) => ({
            pelicula_id,
            entradas_vendidas,
        }));
    }

    private async listarRelacionPaginada<T extends { id: number }>(
        tabla: 'proyeccion' | 'funcion',
        columnas: string,
        ids: number[],
    ): Promise<T[]> {
        const cliente = this.supabaseService.supabaseClient;
        const filas: T[] = [];

        for (const lote of this.dividirEnLotes(ids)) {
            for (let offset = 0; ; offset += 1000) {
                const { data, error } = await cliente
                    .from(tabla)
                    .select(columnas)
                    .in('id', lote)
                    .order('id', { ascending: true })
                    .range(offset, offset + 999);

                if (error) {
                    throw new Error(`No se pudo consultar la relación de las películas: ${error.message}`);
                }

                filas.push(...((data ?? []) as unknown as T[]));
                if (!data || data.length < 1000) {
                    break;
                }
            }
        }

        return filas;
    }

    private dividirEnLotes<T>(elementos: T[], tamano = 500): T[][] {
        const lotes: T[][] = [];
        for (let indice = 0; indice < elementos.length; indice += tamano) {
            lotes.push(elementos.slice(indice, indice + tamano));
        }
        return lotes;
    }
}
