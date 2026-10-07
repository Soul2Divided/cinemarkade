import { Inject, Injectable } from '@angular/core';
import { FormatoSala } from '../sala/sala.model';
import { PrecioEntrada } from './tarifa-formato.model';
import { TarifaFormatoRepository } from './tarifa-formato.repository';

@Injectable({ providedIn: 'root' })
export class TarifaFormatoService {
    constructor(
        @Inject(TarifaFormatoRepository)
        private readonly tarifaFormatoRepository: TarifaFormatoRepository
    ) {}

    async calcularPrecioEntrada(formato: FormatoSala, fecha: string): Promise<PrecioEntrada> {
        this.validarFecha(fecha);

        const tarifa = await this.tarifaFormatoRepository.obtenerPorFormato(formato);
        if (!tarifa) {
            throw new Error(`No hay una tarifa configurada para el formato ${formato}.`);
        }

        const precioBase = Number(tarifa.precio_base);
        if (!Number.isFinite(precioBase) || precioBase < 0) {
            throw new Error(`La tarifa del formato ${formato} no es válida.`);
        }

        const diaSemana = new Date(`${fecha}T12:00:00Z`).getUTCDay();
        const descuentoDiaAplicado = diaSemana >= 1 && diaSemana <= 3;

        return {
            formato,
            precio_base: precioBase,
            precio_final: descuentoDiaAplicado ? precioBase * 0.5 : precioBase,
            descuento_dia_aplicado: descuentoDiaAplicado,
        };
    }

    private validarFecha(fecha: string): void {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            throw new Error('La fecha de la función no es válida.');
        }

        const fechaParseada = new Date(`${fecha}T00:00:00Z`);
        if (Number.isNaN(fechaParseada.getTime()) || fechaParseada.toISOString().slice(0, 10) !== fecha) {
            throw new Error('La fecha de la función no es válida.');
        }
    }
}
