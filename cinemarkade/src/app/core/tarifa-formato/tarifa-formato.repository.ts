import { Injectable } from '@angular/core';
import { FormatoSala } from '../sala/sala.model';
import { TarifaFormato } from './tarifa-formato.model';

@Injectable()
export abstract class TarifaFormatoRepository {
    abstract obtenerPorFormato(formato: FormatoSala): Promise<TarifaFormato | null>;
}
