import { Component, input } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-loader',
  styleUrl: './loader.scss',
  templateUrl: './loader.html',
})
export class Loader {
  message = input<string>('LOADING REEL...');
  fullScreen = input<boolean>(true);
}
