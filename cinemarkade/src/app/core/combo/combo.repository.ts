import { Injectable } from '@angular/core';
import {
    Combo,
    CrearComboInput,
    ComboItem,
    ComboItemInput,
} from './combo.model';

@Injectable()
export abstract class ComboRepository {
    abstract listar(): Promise<Combo[]>;
    abstract obtenerPorId(id: number): Promise<Combo | null>;
    abstract listarItems(comboId: number): Promise<ComboItem[]>;
    abstract crear(datos: CrearComboInput): Promise<Combo>;
    abstract actualizar(id: number, datos: CrearComboInput): Promise<Combo>;
    abstract reemplazarItems(
        comboId: number,
        items: ComboItemInput[]
    ): Promise<ComboItem[]>;
    abstract cambiarActivo(id: number, activo: boolean): Promise<void>;
}
