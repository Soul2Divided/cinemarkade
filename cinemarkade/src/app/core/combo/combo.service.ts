import { Inject, Injectable } from '@angular/core';
import { Combo, CrearComboInput } from './combo.model';
import { ComboRepository } from './combo.repository';

@Injectable({ providedIn: 'root' })
export class ComboService {
    constructor(
        @Inject(ComboRepository) private comboRepository: ComboRepository
    ) { }

    listarCombos(): Promise<Combo[]> {
        return this.comboRepository.listar();
    }

    async obtenerComboPorId(id: number): Promise<Combo | null> {
        this.validarId(id);
        return this.comboRepository.obtenerPorId(id);
    }

    crearCombo(datos: CrearComboInput): Promise<Combo> {
        this.validarDatos(datos);
        return this.comboRepository.crear(this.normalizar(datos));
    }

    actualizarCombo(id: number, datos: CrearComboInput): Promise<Combo> {
        this.validarId(id);
        this.validarDatos(datos);
        return this.comboRepository.actualizar(id, this.normalizar(datos));
    }

    cambiarActivo(id: number, activo: boolean): Promise<void> {
        this.validarId(id);
        return this.comboRepository.cambiarActivo(id, activo);
    }

    private validarDatos(datos: CrearComboInput): void {
        if (!datos.nombre?.trim()) {
            throw new Error('El nombre del combo es obligatorio.');
        }

        if (!Number.isFinite(datos.precio) || datos.precio <= 0) {
            throw new Error('El precio del combo debe ser mayor a cero.');
        }

        if (!Array.isArray(datos.items) || datos.items.length === 0) {
            throw new Error('El combo debe incluir al menos un producto.');
        }

        for (const item of datos.items) {
            if (!Number.isInteger(item.producto_id) || item.producto_id <= 0) {
                throw new Error('Cada producto del combo debe ser válido.');
            }
            if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
                throw new Error('La cantidad de cada producto debe ser un entero mayor a cero.');
            }
        }

        if (
            (datos.fecha_inicio && !this.esFechaValida(datos.fecha_inicio)) ||
            (datos.fecha_fin && !this.esFechaValida(datos.fecha_fin))
        ) {
            throw new Error('Las fechas de vigencia del combo no son válidas.');
        }

        if (
            datos.fecha_inicio && datos.fecha_fin &&
            datos.fecha_fin < datos.fecha_inicio
        ) {
            throw new Error('La fecha de fin no puede ser anterior a la fecha de inicio.');
        }

        const productosUnicos = new Set(datos.items.map(item => item.producto_id));
        if (productosUnicos.size !== datos.items.length) {
            throw new Error('No repitas un producto; ajustá su cantidad en la misma fila.');
        }
    }

    private normalizar(datos: CrearComboInput): CrearComboInput {
        return {
            ...datos,
            nombre: datos.nombre.trim(),
            descripcion: datos.descripcion?.trim() || null,
            imagen: datos.imagen?.trim() || null,
            destacado: datos.destacado ?? false,
            items: datos.items.map(item => ({ ...item })),
        };
    }

    private esFechaValida(valor: string): boolean {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
        const fecha = new Date(`${valor}T00:00:00Z`);
        return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
    }

    private validarId(id: number): void {
        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('El identificador debe ser un entero positivo.');
        }
    }
}
