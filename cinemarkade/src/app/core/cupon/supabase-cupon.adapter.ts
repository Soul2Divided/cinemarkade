import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { Cupon, CuponInput } from './cupon.model';
import { CuponRepository } from './cupon.repository';

@Injectable({ providedIn: 'root' })
export class SupabaseCuponAdapter implements CuponRepository {
    constructor(private supabaseService: SupabaseService) { }

    async listar(): Promise<Cupon[]> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('cupon')
            .select('*')
            .order('fecha_inicio', { ascending: false });

        if (error) throw new Error(`Error al listar los cupones: ${error.message}`);
        return data as Cupon[];
    }

    async obtenerBienvenidaDisponible(): Promise<Cupon | null> {
        /*
         * Que haya una sesión iniciada.
         * Que el cupón esté activo y vigente.
         * Que ese usuario no tenga compras anteriores.
         */
        const { data, error } = await this.supabaseService.supabaseClient.rpc('cupon_bienvenida_disponible');

        if (error) {
            throw new Error(`No se pudo consultar el cupón de bienvenida: ${error.message}`);
        }

        return data as Cupon | null;
    }

    async obtenerPorId(id: number): Promise<Cupon | null> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('cupon')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw new Error(`Error al obtener el cupón: ${error.message}`);
        return data as Cupon | null;
    }

    async crear(datos: CuponInput): Promise<Cupon> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('cupon')
            .insert({ ...datos, activa: true })
            .select('*')
            .single();

        if (error) throw new Error(`Error al crear el cupón: ${error.message}`);
        return data as Cupon;
    }

    async actualizar(id: number, datos: CuponInput): Promise<Cupon> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('cupon')
            .update(datos)
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw new Error(`Error al actualizar el cupón: ${error.message}`);
        return data as Cupon;
    }

    async cambiarActiva(id: number, activa: boolean): Promise<void> {
        const supabase = this.supabaseService.supabaseClient;

        const { error } = await supabase
            .from('cupon')
            .update({ activa })
            .eq('id', id);

        if (error) {
            throw new Error(`Error al cambiar el estado del cupon: ${error.message}`);
        }
    }
}
