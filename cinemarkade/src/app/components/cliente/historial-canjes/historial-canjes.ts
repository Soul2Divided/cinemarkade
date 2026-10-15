import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../navbar/navbar';
import { RecompensaService } from '../../../core/recompensa/recompensa.service';
import { CanjeRecompensa } from '../../../core/recompensa/recompensa.model';

@Component({
    selector: 'app-historial-canjes',
    imports: [CommonModule, RouterLink, Navbar],
    templateUrl: './historial-canjes.html',
    styleUrl: './historial-canjes.scss'
})
export class HistorialCanjes implements OnInit {
    private readonly service = inject(RecompensaService);

    readonly canjes = signal<CanjeRecompensa[]>([]);
    readonly cargando = signal(true);
    readonly error = signal('');

    async ngOnInit(): Promise<void> {
        try {
            this.canjes.set(await this.service.historial());
        } catch (e) {
            this.error.set(e instanceof Error ? e.message : 'No se pudo cargar el historial.');
        } finally {
            this.cargando.set(false);
        }
    }
}
