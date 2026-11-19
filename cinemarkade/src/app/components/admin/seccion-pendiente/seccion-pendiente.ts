import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-seccion-pendiente',
    templateUrl: './seccion-pendiente.html',
    styleUrl: './seccion-pendiente.scss'
})
export class SeccionPendiente {
    readonly titulo = inject(ActivatedRoute).snapshot.data['titulo'];
}
