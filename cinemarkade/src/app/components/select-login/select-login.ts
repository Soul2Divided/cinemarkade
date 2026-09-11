import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';

@Component({
  imports: [Navbar],
  selector: 'app-select-login',
  styleUrl: './select-login.scss',
  templateUrl: './select-login.html',
})
export class SelectLogin {
  constructor(private router: Router) {}

  irALogin(): void {
    this.router.navigate(['/login']);
  }

  irARegistro(): void {
    this.router.navigate(['/registro']);
  }
}
