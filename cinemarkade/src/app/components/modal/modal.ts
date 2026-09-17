import { Component, HostListener, input, output } from '@angular/core';

export type ModalColorVariant = 'yellow' | 'cyan' | 'red';

@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './modal.html',
  styleUrls: ['./modal.scss']
})
export class Modal {
  isOpen = input<boolean>(false);
  title = input<string>('AVISO DEL SISTEMA');
  subtitle = input<string>('');
  variant = input<ModalColorVariant>('yellow');
  closeOnBackdrop = input<boolean>(true);

  close = output<void>();

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isOpen()) {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdrop() && (event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }
}