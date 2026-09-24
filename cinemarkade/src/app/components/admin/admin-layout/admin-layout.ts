import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface SeccionAdmin {
  label: string;
  route: string;
}

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-admin-layout',
  styleUrl: './admin-layout.scss',
  templateUrl: './admin-layout.html',
})
export class AdminLayout {
  secciones: SeccionAdmin[] = [
    { label: 'PELÍCULAS', route: '/admin/peliculas' },
    { label: 'SALAS', route: '/admin/sala' },
  ];
}