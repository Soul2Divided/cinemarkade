import { Component, EventEmitter, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-navbar',
  styleUrl: './navbar.scss',
  templateUrl: './navbar.html',
})
export class Navbar {
  @Output() search = new EventEmitter<string>();

  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.search.emit(query);
  }
}
