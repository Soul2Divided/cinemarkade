import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

export interface SeccionAdmin {
  route: string;
  label: string;
  icon: string;
  categoria?: string;
}

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-admin-layout',
  styleUrl: './admin-layout.scss',
  templateUrl: './admin-layout.html',
})

export class AdminLayout {
  secciones: SeccionAdmin[] = [
    // --- CARTELERÍA Y SALAS ---
    { route: '/admin/peliculas', label: 'PELÍCULAS', icon: '🎬' },
    { route: '/admin/salas', label: 'SALAS', icon: '🏛️' },
    { route: '/admin/funciones', label: 'FUNCIONES', icon: '⏰' },

    // --- CANDYBAR Y COMBOS ---
    { route: '/admin/productos', label: 'PRODUCTOS CANDY', icon: '🍿' },
    { route: '/admin/combos', label: 'COMBOS & OFERTAS', icon: '🎟️' },
    { route: '/admin/puntos', label: 'RECOMPENSAS PUNTOS', icon: '🪙' },

    // --- METRICAS Y FACTURACIÓN ---
    { route: '/admin/reportes', label: 'REPORTES & PDF', icon: '📊' },
    { route: '/admin/estadisticas', label: 'ESTADÍSTICAS & VENTAS', icon: '📈' },

    // --- AUDITORÍA ---
    { route: '/admin/log-actividad', label: 'LOG DE AUDITORÍA', icon: '📜' }
  ];
}