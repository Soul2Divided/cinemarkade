import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { Combo, CrearComboInput, ComboItem, ComboItemInput } from './combo.model';
import { ComboRepository } from './combo.repository';

@Injectable({ providedIn: 'root' })
export class SupabaseComboAdapter implements ComboRepository {
    constructor(private supabaseService: SupabaseService) { }

    async listar(): Promise<Combo[]> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('combo')
            .select('*, combo_item(*)')
            .order('nombre', { ascending: true });

        if (error) throw new Error(`Error al listar los combos: ${error.message}`);
        const combos = data as Array<Combo & { combo_item?: ComboItem[] }>;
        return combos.map(({ combo_item, ...combo }) => ({
            ...combo,
            items: combo_item ?? [],
        }));
    }

    async obtenerPorId(id: number): Promise<Combo | null> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('combo')
            .select('*, combo_item(*)')
            .eq('id', id)
            .maybeSingle();

        if (error) throw new Error(`Error al obtener el combo: ${error.message}`);
        if (!data) return null;

        const { combo_item, ...combo } = data;
        return { ...combo, items: combo_item ?? [] } as Combo;
    }

    async listarItems(comboId: number): Promise<ComboItem[]> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('combo_item')
            .select('*')
            .eq('combo_id', comboId)
            .order('id', { ascending: true });

        if (error) throw new Error(`Error al listar los productos del combo: ${error.message}`);
        return data as ComboItem[];
    }

    async crear(datos: CrearComboInput): Promise<Combo> {
        const { items, ...datosCombo } = datos;
        const supabase = this.supabaseService.supabaseClient;

        const { data: combo, error: comboError } = await supabase
            .from('combo')
            .insert({ ...datosCombo, activo: datosCombo.activo ?? true })
            .select('*')
            .single();

        if (comboError) throw new Error(`Error al crear el combo: ${comboError.message}`);

        try {
            const itemsGuardados = await this.insertarItems(combo.id, items);
            return { ...combo, items: itemsGuardados } as Combo;
        } catch (error) {
            const { error: rollbackError } = await supabase
                .from('combo')
                .delete()
                .eq('id', combo.id);

            if (rollbackError) {
                throw new Error(
                    `No se pudieron guardar los productos del combo y falló la reversión: ${rollbackError.message}`
                );
            }
            throw error;
        }
    }

    async actualizar(id: number, datos: CrearComboInput): Promise<Combo> {
        const { items, ...datosCombo } = datos;
        const supabase = this.supabaseService.supabaseClient;

        const { data: combo, error: comboError } = await supabase
            .from('combo')
            .update(datosCombo)
            .eq('id', id)
            .select('*')
            .single();

        if (comboError) throw new Error(`Error al actualizar el combo: ${comboError.message}`);

        const itemsGuardados = await this.reemplazarItems(id, items);
        return { ...combo, items: itemsGuardados } as Combo;
    }

    async reemplazarItems(comboId: number, items: ComboItemInput[]): Promise<ComboItem[]> {
        const supabase = this.supabaseService.supabaseClient;
        if (items.length === 0) {
            const { error } = await supabase
                .from('combo_item')
                .delete()
                .eq('combo_id', comboId);

            if (error) {
                throw new Error(`Error al quitar los productos del combo: ${error.message}`);
            }
            return [];
        }

        // Upsert first so a failed save never clears the existing composition.
        const { data, error: upsertError } = await supabase
            .from('combo_item')
            .upsert(
                items.map(item => ({ ...item, combo_id: comboId })),
                { onConflict: 'combo_id,producto_id' }
            )
            .select('*');

        if (upsertError) {
            throw new Error(`Error al guardar los productos del combo: ${upsertError.message}`);
        }

        const productoIds = items.map(item => item.producto_id);
        const { error: deleteError } = await supabase
            .from('combo_item')
            .delete()
            .eq('combo_id', comboId)
            .not('producto_id', 'in', `(${productoIds.join(',')})`);

        if (deleteError) {
            throw new Error(`Se guardaron los productos, pero no se pudieron quitar los anteriores: ${deleteError.message}`);
        }
        return data as ComboItem[];
    }

    async cambiarActivo(id: number, activo: boolean): Promise<void> {
        const { error } = await this.supabaseService.supabaseClient
            .from('combo')
            .update({ activo })
            .eq('id', id);

        if (error) throw new Error(`Error al cambiar el estado del combo: ${error.message}`);
    }

    private async insertarItems(
        comboId: number,
        items: ComboItemInput[]
    ): Promise<ComboItem[]> {
        if (items.length === 0) return [];

        const { data, error } = await this.supabaseService.supabaseClient
            .from('combo_item')
            .insert(items.map(item => ({ ...item, combo_id: comboId })))
            .select('*');

        if (error) throw new Error(`Error al guardar los productos del combo: ${error.message}`);
        return data as ComboItem[];
    }
}
