import { Injectable } from '@angular/core';
import { ProductoRepository } from './producto.repository';
import { ProductoInput, Producto } from './producto.model';
import { SupabaseService } from '../services/supabase.service';

@Injectable({ providedIn: 'root' })
export class SupabaseProductoAdapter implements ProductoRepository {
    constructor(private supabaseService: SupabaseService) { }

    async listar(): Promise<Producto[]> {
        const supabase = this.supabaseService.supabaseClient;

        const { data, error } = await supabase
            .from('producto')
            .select()
            .order('nombre', { ascending: true });

        if (error) {
            throw new Error(`Error al listar las salas: ${error.message}`);
        }

        return data as Producto[];
    }

    async crear(datos: ProductoInput): Promise<Producto> {
        const supabase = this.supabaseService.supabaseClient;

        const { data, error } = await supabase
            .from('producto')
            .insert(datos)
            .select()
            .single();

        if (error) {
            throw new Error(`Error al crear el producto: ${error.message}`);
        }

        return data as Producto;
    }

    async actualizar(id: number, datos: ProductoInput): Promise<Producto> {
        const supabase = this.supabaseService.supabaseClient;

        const { data, error } = await supabase
            .from('producto')
            .update(datos)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Error al actualizar el producto: ${error.message}`);
        }

        return data as Producto;
    }

    async cambiarActiva(id: number, activa: boolean): Promise<void> {
        const supabase = this.supabaseService.supabaseClient;

        const { error } = await supabase
            .from('producto')
            .update({ activa })
            .eq('id', id);

        if (error) {
            throw new Error(`Error al cambiar el estado del producto: ${error.message}`);
        }
    }
}