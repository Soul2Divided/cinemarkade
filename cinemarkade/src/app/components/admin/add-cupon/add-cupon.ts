import { Component, inject, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Navbar } from '../../navbar/navbar';
import { Loader } from '../../loader/loader';
import { Modal } from '../../modal/modal';
import { CuponInput } from '../../../core/cupon/cupon.model';
import { CuponService } from '../../../core/cupon/cupon.service';
import { UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-add-cupon',
  standalone: true,
  imports: [ReactiveFormsModule, Loader, Modal, UpperCasePipe],
  templateUrl: './add-cupon.html',
  styleUrls: ['./add-cupon.scss']
})
export class AddCupon implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private cuponService = inject(CuponService);

  esEdicion = false;
  cuponId: number | null = null;
  errorMessage = '';
  mostrarModal = signal<boolean>(false);
  mostrarLoader = signal<boolean>(false);

  formCupon = new FormGroup({
    codigo: new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(17)]),
    porcentajeDescuento: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(100)]),
    edadMinima: new FormControl<number>(0, [Validators.required, Validators.min(0)]),
    fechaInicio: new FormControl('', [Validators.required]),
    fechaFin: new FormControl('', [Validators.required])
  });

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.esEdicion = true;
      this.cuponId = Number(idParam);
      await this.cargarCuponParaEditar(this.cuponId);
    }
  }

  async cargarCuponParaEditar(id: number): Promise<void> {
    try {
      const cupon = await this.cuponService.obtenerPorId(id);
      if (cupon) {
        this.formCupon.patchValue({
          codigo: cupon.codigo,
          porcentajeDescuento: cupon.porcentaje_descuento,
          edadMinima: cupon.edad_minima,
          fechaInicio: cupon.fecha_inicio,
          fechaFin: cupon.fecha_fin
        });
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Error al cargar cupón para editar:', error);
    }
  }

  isFieldInvalid(field: string): boolean {
    const control = this.formCupon.get(field);
    return !!(control && control.touched && control.invalid);
  }

  getFieldError(field: string): string {
    const control = this.formCupon.get(field);
    if (!control?.touched) return '';

    if (control.hasError('required')) {
      const requiredMessages: Record<string, string> = {
        codigo: 'El código del cupón es obligatorio',
        porcentajeDescuento: 'El porcentaje de descuento es obligatorio',
        edadMinima: 'La edad mínima es obligatoria',
        fechaInicio: 'La fecha de inicio es obligatoria',
        fechaFin: 'La fecha de fin es obligatoria'
      };
      return requiredMessages[field] ?? 'Este campo es obligatorio';
    }

    if (field === 'porcentajeDescuento') {
      if (control.hasError('min')) return 'El descuento debe ser al menos 1%';
      if (control.hasError('max')) return 'El descuento no puede superar el 100%';
    }

    if (field === 'edadMinima' && control.hasError('min')) {
      return 'La edad no puede ser negativa';
    }

    if (field === 'codigo' && control.hasError('minlength')) {
      return 'El código debe tener al menos 3 caracteres';
    }

    if (field === 'codigo' && control.hasError('maxlength')) {
      return 'El código debe tener 17 caracteres como maximo';
    }

    return '';
  }

  async onSubmit(): Promise<void> {
    if (this.formCupon.invalid) {
      this.formCupon.markAllAsTouched();
      this.triggerError('POR FAVOR COMPLETÁ TODOS LOS CAMPOS OBLIGATORIOS');
      return;
    }

    this.errorMessage = '';
    this.mostrarLoader.set(true);

    try {
      const valores = this.formCupon.getRawValue();

      const datos: CuponInput = {
        codigo: valores.codigo!.toUpperCase().trim(),
        porcentaje_descuento: Number(valores.porcentajeDescuento!),
        edad_minima: Number(valores.edadMinima ?? 0),
        fecha_inicio: valores.fechaInicio!,
        fecha_fin: valores.fechaFin!
      };

      if (this.esEdicion && this.cuponId) {
        await this.cuponService.actualizarCupon(this.cuponId, datos);
      } else {
        await this.cuponService.crearCupon(datos);
      }

      this.mostrarModal.set(true);
    } catch (error) {
      this.triggerError(error instanceof Error ? error.message : 'No se pudo guardar el cupón');
    } finally {
      this.mostrarLoader.set(false);
    }
  }

  triggerError(msg: string): void {
    this.errorMessage = msg;
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.router.navigate(['/admin/cupones']);
  }

  cancelar(): void {
    this.router.navigate(['/admin/cupones']);
  }
}
