import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Route, Router } from '@angular/router';
import { FormatoSala, FORMATOS_SALA, SalaInput } from '../../../core/sala/sala.model';
import { SalaService } from '../../../core/sala/sala.service';
import { Loader } from '../../loader/loader';
import { Modal } from '../../modal/modal';

@Component({
  imports: [ReactiveFormsModule, Loader, Modal],
  selector: 'app-add-sala',
  styleUrl: './add-sala.scss',
  templateUrl: './add-sala.html',
})
export class AddSala implements OnInit {
  errorMessage: string = '';
  mostrarModal = signal<boolean>(false);
  mostrarLoader = signal<boolean>(false);
  esEdicion: boolean = false;
  salaId: number | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private salaService: SalaService
  ) { }

  formatosDisponibles: FormatoSala[] = FORMATOS_SALA;

  formSala = new FormGroup({
    formato: new FormControl<FormatoSala | null>(null, [Validators.required])
  });

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.esEdicion = true;
      this.salaId = Number(idParam);
      await this.cargarSalaParaEditar(this.salaId);
    }
  }

  async cargarSalaParaEditar(id: number): Promise<void> {
    try {
      const sala = await this.salaService.obtenerPorId(id);
      if (sala) {
        this.formSala.patchValue({
          formato: sala.formato
        });
      }
    } catch (error) {
      console.error('Error al cargar sala para editar:', error);
    }
  }

  seleccionarFormato(formato: FormatoSala): void {
    this.formSala.get('formato')?.setValue(formato);
  }

  async onSubmit(): Promise<void> {
    const formatoSeleccionado = this.formSala.get('formato')?.value as FormatoSala | null;

    if (!this.formSala.valid || !formatoSeleccionado || !FORMATOS_SALA.includes(formatoSeleccionado)) {
      this.formSala.markAllAsTouched();
      this.triggerError('POR FAVOR COMPLETÁ TODOS LOS CAMPOS');
      return;
    }

    this.errorMessage = '';
    this.mostrarLoader.set(true);

    try {
      const datos: SalaInput = { formato: formatoSeleccionado };
      if (this.esEdicion && this.salaId) {
        await this.salaService.actualizarSala(this.salaId, datos);
      } else {
        await this.salaService.crearSala(datos);
      }
      this.mostrarModal.set(true);
    } catch (error) {
      this.triggerError(error instanceof Error
        ? error.message
        : 'No se pudo crear la sala');
    } finally {
      this.mostrarLoader.set(false);
    }
  }

  triggerError(msg: string): void {
    this.errorMessage = msg;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.formSala.get(field);
    return !!(control && control.touched && control.invalid);
  }

  getFieldError(field: string): string {
    const control = this.formSala.get(field);

    if (!control?.touched) {
      return '';
    }

    if (control.hasError('required')) {
      const requiredMessages: Record<string, string> = {
        formato: 'Debes seleccionar un formato para la sala'
      };

      return requiredMessages[field] ?? 'Este campo es obligatorio';
    }

    return '';
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.router.navigate(['/admin/salas']);
  }

  cancelar(): void {
    this.router.navigate(['/admin/salas']);
  }
}