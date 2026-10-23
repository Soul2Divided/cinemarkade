import { Pipe, PipeTransform } from '@angular/core';
@Pipe({
    name: 'formatoDuracion',
})
export class FormatoDuracion implements PipeTransform {
    transform(duracion: number): string {
        const horas = Math.floor(duracion / 60);
        const minutos = duracion % 60;
        return `${horas}h ${minutos}m`;
    }
}
