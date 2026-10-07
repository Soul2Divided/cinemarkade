import { Injectable } from '@angular/core';
import { FuncionRepository } from './funcion.repository';
import { Funcion, FuncionInput, Proyeccion } from './funcion.model';
import { SupabaseService } from '../services/supabase.service';

type FuncionConProyecciones = Omit<Funcion, 'proyecciones'> & {
    proyeccion?: Proyeccion[] | null;
};

@Injectable({ providedIn: 'root' })
export class SupabaseFuncionAdapter implements FuncionRepository {
    constructor(private readonly supabaseService: SupabaseService) { }

    async listar(): Promise<Funcion[]> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('funcion')
            .select('*, proyeccion(*)')
            .order('fecha', { ascending: true });

        if (error) throw new Error(`Error al listar las funciones: ${error.message}`);
        return (data ?? []).map(row => this.mapFuncion(row as FuncionConProyecciones));
    }

    async obtenerPorId(id: number): Promise<Funcion> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('funcion')
            .select('*, proyeccion(*)')
            .eq('id', id)
            .single();

        if (error) throw new Error(`Error al obtener la función: ${error.message}`);
        return this.mapFuncion(data as FuncionConProyecciones);
    }

    async listarPorPelicula(peliculaId: number): Promise<Funcion[]> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('funcion')
            .select('*, proyeccion(*)')
            .eq('pelicula_id', peliculaId)
            .order('fecha', { ascending: true });

        if (error) {
            throw new Error(`Error al listar las funciones de la película: ${error.message}`);
        }
        return (data ?? []).map(row => this.mapFuncion(row as FuncionConProyecciones));
    }

    async crearConProyecciones(datos: FuncionInput, horarios: string[]): Promise<Funcion> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('funcion')
            .insert(datos)
            .select()
            .single();

        if (error) throw new Error(`Error al crear la función: ${error.message}`);

        const proyecciones = await this.insertarProyecciones(data.id, horarios);
        if (!proyecciones) {
            await this.supabaseService.supabaseClient
                .from('funcion')
                .update({ activa: false })
                .eq('id', data.id);
            throw new Error('La función se guardó sin sus horarios y fue dada de baja.');
        }

        return { ...data, proyecciones } as Funcion;
    }

    async actualizarConProyecciones(
        id: number,
        datos: FuncionInput,
        horarios: string[]
    ): Promise<Funcion> {
        const anterior = await this.obtenerPorId(id);
        const { data, error } = await this.supabaseService.supabaseClient
            .from('funcion')
            .update(datos)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(`Error al actualizar la función: ${error.message}`);

        const { error: borrarError } = await this.supabaseService.supabaseClient
            .from('proyeccion')
            .delete()
            .eq('funcion_id', id);

        if (borrarError) {
            await this.restaurarFuncion(anterior);
            throw new Error(`Error al reemplazar los horarios: ${borrarError.message}`);
        }

        const proyecciones = await this.insertarProyecciones(id, horarios);
        if (!proyecciones) {
            await this.restaurarFuncion(anterior);
            throw new Error('No se pudieron guardar los nuevos horarios; se restauró la función anterior. Revisá las políticas de proyeccion en Supabase.');
        }

        return { ...data, proyecciones } as Funcion;
    }

    async cambiarActiva(id: number, activa: boolean): Promise<void> {
        const { error } = await this.supabaseService.supabaseClient
            .from('funcion')
            .update({ activa })
            .eq('id', id);

        if (error) throw new Error(`Error al cambiar el estado de la función: ${error.message}`);
    }

    async existeFuncionActivaEnSala(
        salaId: number,
        fecha: string,
        excluirFuncionId?: number
    ): Promise<boolean> {
        let query = this.supabaseService.supabaseClient
            .from('funcion')
            .select('id', { count: 'exact', head: true })
            .eq('sala_id', salaId)
            .eq('fecha', fecha)
            .eq('activa', true);

        if (excluirFuncionId !== undefined) query = query.neq('id', excluirFuncionId);

        const { count, error } = await query;
        if (error) throw new Error(`Error al verificar la sala: ${error.message}`);
        return (count ?? 0) > 0;
    }

    private async insertarProyecciones(
        funcionId: number,
        horarios: string[]
    ): Promise<Proyeccion[] | null> {
        const filas = horarios.map(horario => ({
            funcion_id: funcionId,
            horario,
            activa: true,
        }));

        const { data, error } = await this.supabaseService.supabaseClient
            .from('proyeccion')
            .insert(filas)
            .select();

        if (error) {
            console.error('Error al guardar los horarios de la función:', error);
            return null;
        }
        return (data ?? []) as Proyeccion[];
    }

    private async restaurarFuncion(anterior: Funcion): Promise<void> {
        const { proyecciones, ...datosFuncion } = anterior;
        await this.supabaseService.supabaseClient
            .from('funcion')
            .update(datosFuncion)
            .eq('id', anterior.id);

        if (proyecciones.length > 0) {
            await this.supabaseService.supabaseClient
                .from('proyeccion')
                .insert(proyecciones.map(({ id: _id, ...proyeccion }) => proyeccion));
        }
    }

    private mapFuncion(row: FuncionConProyecciones): Funcion {
        const { proyeccion, ...funcion } = row;
        return {
            ...funcion,
            proyecciones: (proyeccion ?? []).sort((a, b) => a.horario.localeCompare(b.horario)),
        };
    }
}
