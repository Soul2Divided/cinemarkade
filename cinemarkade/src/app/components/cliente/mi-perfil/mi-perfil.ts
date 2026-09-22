import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Navbar } from '../../navbar/navbar';
import { AuthService } from '../../../auth/auth.service';

@Component({
  imports: [Navbar],
  selector: 'app-mi-perfil',
  styleUrl: './mi-perfil.scss',
  templateUrl: './mi-perfil.html',
})
export class MiPerfil implements OnInit {
  constructor(private router: Router, public authService: AuthService) {}

  ngOnInit(): void {
    
  }

  abrirEditarPerfil(): void {
    console.log('Editar perfil');
  }

  irAHistorialCompras(): void {
    this.router.navigate(['/historial-compras']);
  }

  irAHistorialFunciones(): void {
    this.router.navigate(['/historial-funciones']);
  }

  irACanjearPuntos(): void {
    this.router.navigate(['/canjear-puntos']);
  }
}
