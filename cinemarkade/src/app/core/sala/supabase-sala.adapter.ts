import { Injectable } from '@angular/core';
import { SalaRepository } from './sala.repository';
import { SalaInput, Sala } from './sala.model';
import { SupabaseService } from '../services/supabase.service';

@Injectable({ providedIn: 'root' })
export class SupabaseSalaAdapter implements SalaRepository {
    constructor(private supabaseService: SupabaseService) { }

    async listar(): Promise<Sala[]> {
        const supabase = this.supabaseService.supabaseClient;

        const { data, error } = await supabase
            .from('sala')
            .select()
            .order('id', { ascending: true });

        if (error) {
            throw new Error(`Error al listar las salas: ${error.message}`);
        }

        return data as Sala[];
    }

    async crear(datos: SalaInput): Promise<Sala> {
        const supabase = this.supabaseService.supabaseClient;

        const { data, error } = await supabase
            .from('sala')
            .insert(datos)
            .select()
            .single();

        if (error) {
            throw new Error(`Error al crear la sala: ${error.message}`);
        }

        return data as Sala;
    }

    async actualizar(id: number, datos: SalaInput): Promise<Sala> {
        const supabase = this.supabaseService.supabaseClient;

        const { data, error } = await supabase
            .from('sala')
            .update(datos)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Error al actualizar la sala: ${error.message}`);
        }

        return data as Sala;
    }

    async cambiarActiva(id: number, activa: boolean): Promise<void> {
        const supabase = this.supabaseService.supabaseClient;

        const { error } = await supabase
            .from('sala')
            .update({ activa })
            .eq('id', id);

        if (error) {
            throw new Error(`Error al cambiar el estado de la sala: ${error.message}`);
        }
    }

    async obtenerPorId(id: number): Promise<Sala> {
        const supabase = this.supabaseService.supabaseClient;

        const { data, error } = await supabase
            .from('sala')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            throw new Error(`Error obtener la sala: ${error.message}`);
        }

        return data as Sala;
    }
}