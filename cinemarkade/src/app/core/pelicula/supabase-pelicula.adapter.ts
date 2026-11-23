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
        const cliente = this.supabaseService.supabasePublicClient;
        const compras: { id: string; proyeccion_id: number }[] = [];

        for (let offset = 0; ; offset += 1000) {
            const { data, error } = await cliente
                .from('compra')
                .select('id, proyeccion_id')
                .in('estado', ['confirmada', 'utilizada'])
                .not('proyeccion_id', 'is', null)
                .range(offset, offset + 999);

            if (error) {
                throw new Error(`No se pudieron consultar las entradas vendidas: ${error.message}`);
            }

            compras.push(...((data ?? []) as { id: string; proyeccion_id: number }[]));
            if (!data || data.length < 1000) {
                break;
            }
        }

        if (compras.length === 0) {
            return [];
        }

        const entradasPorCompra = new Map<string, number>();
        const idsCompra = compras.map(compra => compra.id);

        for (const lote of this.dividirEnLotes(idsCompra)) {
            for (let offset = 0; ; offset += 1000) {
                const { data, error } = await cliente
                    .from('compra_butaca')
                    .select('compra_id')
                    .in('compra_id', lote)
                    .range(offset, offset + 999);

                if (error) {
                    throw new Error(`No se pudieron contar las entradas vendidas: ${error.message}`);
                }

                for (const entrada of (data ?? []) as { compra_id: string }[]) {
                    entradasPorCompra.set(
                        entrada.compra_id,
                        (entradasPorCompra.get(entrada.compra_id) ?? 0) + 1,
                    );
                }

                if (!data || data.length < 1000) {
                    break;
                }
            }
        }

        const proyecciones = await this.listarRelacionPaginada<{ id: number; funcion_id: number }>(
            'proyeccion',
            'id, funcion_id',
            [...new Set(compras.map(compra => compra.proyeccion_id))],
        );
        const funcionPorProyeccion = new Map(proyecciones.map(proyeccion => [proyeccion.id, proyeccion.funcion_id]));
        const funciones = await this.listarRelacionPaginada<{ id: number; pelicula_id: number }>(
            'funcion',
            'id, pelicula_id',
            [...new Set(proyecciones.map(proyeccion => proyeccion.funcion_id))],
        );
        const peliculaPorFuncion = new Map(funciones.map(funcion => [funcion.id, funcion.pelicula_id]));
        const ventasPorPelicula = new Map<number, number>();

        for (const compra of compras) {
            const funcionId = funcionPorProyeccion.get(compra.proyeccion_id);
            const peliculaId = funcionId ? peliculaPorFuncion.get(funcionId) : undefined;
            const cantidad = entradasPorCompra.get(compra.id) ?? 0;

            if (peliculaId && cantidad > 0) {
                ventasPorPelicula.set(peliculaId, (ventasPorPelicula.get(peliculaId) ?? 0) + cantidad);
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
        const cliente = this.supabaseService.supabasePublicClient;
        const filas: T[] = [];

        for (const lote of this.dividirEnLotes(ids)) {
            for (let offset = 0; ; offset += 1000) {
                const { data, error } = await cliente
                    .from(tabla)
                    .select(columnas)
                    .in('id', lote)
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
