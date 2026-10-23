import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

@Directive({
    selector: '[appEnfoque]', //se aplica como atributo, lo tengo que usar tipo <button appEnfoque> o <div appEnfoque>
})
export class EnfoqueDirective implements AfterViewInit {
    private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef); //obtengo el elemento al que se le aplicó la directiva

    ngAfterViewInit(): void {
        this.elemento.nativeElement.focus();
    }
}