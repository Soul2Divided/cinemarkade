import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { Cupon, CuponInput, CuponRow } from './cupon.model';
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
        return (data ?? []).map(row => this.mapToModel(row as CuponRow));
    }

    async obtenerPorId(id: number): Promise<Cupon | null> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('cupon')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw new Error(`Error al obtener el cupón: ${error.message}`);
        return data ? this.mapToModel(data as CuponRow) : null;
    }

    async crear(datos: CuponInput): Promise<Cupon> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('cupon')
            .insert(this.mapToRow(datos))
            .select('*')
            .single();

        if (error) throw new Error(`Error al crear el cupón: ${error.message}`);
        return this.mapToModel(data as CuponRow);
    }

    async actualizar(id: number, datos: CuponInput): Promise<Cupon> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('cupon')
            .update(this.mapToRow(datos))
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw new Error(`Error al actualizar el cupón: ${error.message}`);
        return this.mapToModel(data as CuponRow);
    }

    async eliminar(id: number): Promise<void> {
        const { error } = await this.supabaseService.supabaseClient
            .from('cupon')
            .delete()
            .eq('id', id);

        if (error) throw new Error(`Error al eliminar el cupón: ${error.message}`);
    }

    private mapToModel(row: CuponRow): Cupon {
        return {
            id: row.id,
            codigo: row.codigo,
            porcentajeDescuento: Number(row.porcentaje_descuento),
            edadMinima: Number(row.edad_minima),
            fechaInicio: row.fecha_inicio,
            fechaFin: row.fecha_fin,
        };
    }

    private mapToRow(datos: CuponInput): Omit<CuponRow, 'id'> {
        return {
            codigo: datos.codigo,
            porcentaje_descuento: datos.porcentajeDescuento,
            edad_minima: datos.edadMinima,
            fecha_inicio: datos.fechaInicio,
            fecha_fin: datos.fechaFin,
        };
    }
}
