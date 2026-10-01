import { Inject, Injectable } from '@angular/core';
import { CuponRepository } from './cupon.repository';
import { Cupon, CuponInput } from './cupon.model';

@Injectable({ providedIn: 'root' })
export class CuponService {
    constructor(
        @Inject(CuponRepository) private cuponRepository: CuponRepository
    ) { }

    listarCupones(): Promise<Cupon[]> {
        return this.cuponRepository.listar();
    }

    obtenerPorId(id: number): Promise<Cupon | null> {
        this.validarId(id);
        return this.cuponRepository.obtenerPorId(id);
    }

    crearCupon(datos: CuponInput): Promise<Cupon> {
        this.validarDatos(datos);
        return this.cuponRepository.crear(this.normalizar(datos));
    }

    actualizarCupon(id: number, datos: CuponInput): Promise<Cupon> {
        this.validarId(id);
        this.validarDatos(datos);
        return this.cuponRepository.actualizar(id, this.normalizar(datos));
    }

    eliminarCupon(id: number, activa: boolean): Promise<void> {
        this.validarId(id);
        return this.cuponRepository.cambiarActiva(id, activa);
    }

    private validarDatos(datos: CuponInput): void {
        if (!datos.codigo?.trim()) {
            throw new Error('El código del cupón es obligatorio.');
        }
        if (!Number.isFinite(datos.porcentaje_descuento) || datos.porcentaje_descuento < 1 || datos.porcentaje_descuento > 100) {
            throw new Error('El descuento debe estar entre 1% y 100%.');
        }
        if (!Number.isInteger(datos.edad_minima) || datos.edad_minima < 0) {
            throw new Error('La edad mínima debe ser un entero igual o mayor a cero.');
        }
        if (!this.esFechaValida(datos.fecha_inicio) || !this.esFechaValida(datos.fecha_fin)) {
            throw new Error('Las fechas de vigencia son obligatorias y deben ser válidas.');
        }
        if (datos.fecha_fin < datos.fecha_inicio) {
            throw new Error('La fecha de vencimiento no puede ser anterior a la fecha de inicio.');
        }
    }

    private normalizar(datos: CuponInput): CuponInput {
        return { ...datos, codigo: datos.codigo.trim().toUpperCase() };
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
