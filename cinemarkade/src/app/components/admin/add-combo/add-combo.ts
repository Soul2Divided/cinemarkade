import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Combo, CrearComboInput } from '../../../core/combo/combo.model';
import { ComboService } from '../../../core/combo/combo.service';
import { Producto } from '../../../core/producto/producto.model';
import { ProductoService } from '../../../core/producto/producto.service';
import { Loader } from '../../loader/loader';
import { Modal } from '../../modal/modal';

type ComboItemForm = FormGroup<{
  productoId: FormControl<number | null>;
  cantidad: FormControl<number | null>;
}>;

@Component({
  selector: 'app-add-combo',
  imports: [CommonModule, ReactiveFormsModule, Loader, Modal],
  templateUrl: './add-combo.html',
  styleUrl: './add-combo.scss',
})

export class AddCombo implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly comboService = inject(ComboService);
  private readonly productoService = inject(ProductoService);

  readonly productos = signal<Producto[]>([]);
  readonly mostrarModal = signal(false);
  readonly mostrarLoader = signal(false);
  readonly errorMessage = signal('');

  imagePreviewUrl: string | null = null;
  esEdicion = false;
  comboId: number | null = null;
  comboOriginal: Combo | null = null;

  readonly formCombo = new FormGroup({
    nombre: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    descripcion: new FormControl(''),
    imagen: new FormControl(''),
    descuento: new FormControl<number | null>(null, [Validators.required, Validators.min(0), Validators.max(99)]),
    destacado: new FormControl(false, { nonNullable: true }),
    fechaInicio: new FormControl(''),
    fechaFin: new FormControl(''),
    items: new FormArray<ComboItemForm>([]),
  });

  get items(): FormArray<ComboItemForm> {
    return this.formCombo.controls.items;
  }

  get totalPrecioLista(): number {
    return this.items.controls.reduce((total, itemForm) => {
      const productoId = itemForm.controls.productoId.value;
      const cantidad = itemForm.controls.cantidad.value ?? 0;
      const producto = this.productos().find(item => item.id === productoId);
      return total + (producto?.precio ?? 0) * cantidad;
    }, 0);
  }

  get precioFinalCombo(): number {
    const porcentaje = this.formCombo.controls.descuento.value ?? 0;
    const total = this.totalPrecioLista * (1 - porcentaje / 100);
    return Math.round(total * 100) / 100;
  }

  async ngOnInit(): Promise<void> {
    this.agregarItem();
    await this.cargarProductos();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.esEdicion = true;
      this.comboId = Number(idParam);
      await this.cargarCombo(this.comboId);
    }
  }

  agregarItem(): void {
    this.items.push(new FormGroup({
      productoId: new FormControl<number | null>(null, Validators.required),
      cantidad: new FormControl<number | null>(1, [Validators.required, Validators.min(1)]),
    }));
  }

  quitarItem(index: number): void {
    if (this.items.length > 1) this.items.removeAt(index);
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Seleccioná un archivo de imagen válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreviewUrl = reader.result as string;
      this.formCombo.controls.imagen.setValue(this.imagePreviewUrl);
      this.formCombo.controls.imagen.markAsTouched();
      this.errorMessage.set('');
      this.cdr.detectChanges();
    };
    reader.onerror = () => this.errorMessage.set('No se pudo leer la imagen seleccionada.');
    reader.readAsDataURL(file);
  }

  onUrlInput(event: Event): void {
    const url = (event.target as HTMLInputElement).value.trim();
    this.imagePreviewUrl = url && (url.startsWith('http') || url.startsWith('data:image')) ? url : null;
  }

  removerImagen(event: Event): void {
    event.stopPropagation();
    this.imagePreviewUrl = null;
    this.formCombo.controls.imagen.setValue('');
  }

  productosParaFila(index: number): Producto[] {
    const selectedId = this.items.at(index).controls.productoId.value;
    return this.productos().filter(producto => producto.activa || producto.id === selectedId);
  }

  async onSubmit(): Promise<void> {
    this.errorMessage.set('');
    if (this.formCombo.invalid) {
      this.formCombo.markAllAsTouched();
      this.errorMessage.set('Completá los datos del combo y sus productos.');
      return;
    }

    const value = this.formCombo.getRawValue();
    const datos: CrearComboInput = {
      nombre: value.nombre ?? '',
      descripcion: value.descripcion?.trim() || null,
      imagen: value.imagen?.trim() || null,
      precio: this.precioFinalCombo,
      activo: this.comboOriginal?.activo ?? true,
      destacado: value.destacado ?? false,
      fecha_inicio: value.fechaInicio || null,
      fecha_fin: value.fechaFin || null,
      items: value.items.map(item => ({
        producto_id: Number(item.productoId),
        cantidad: Number(item.cantidad),
      })),
    };

    this.mostrarLoader.set(true);
    try {
      if (this.esEdicion && this.comboId !== null) {
        await this.comboService.actualizarCombo(this.comboId, datos);
      } else {
        await this.comboService.crearCombo(datos);
      }
      this.mostrarModal.set(true);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo guardar el combo.');
    } finally {
      this.mostrarLoader.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/admin/combos']);
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.router.navigate(['/admin/combos']);
  }

  isFieldInvalid(field: 'nombre' | 'descuento' | 'fechaInicio' | 'fechaFin'): boolean {
    const control = this.formCombo.controls[field];
    return control.touched && control.invalid;
  }

  private async cargarProductos(): Promise<void> {
    try {
      this.productos.set(await this.productoService.listarProductos());
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudieron cargar los productos.');
    }
  }

  private async cargarCombo(id: number): Promise<void> {
    try {
      const combo = await this.comboService.obtenerComboPorId(id);
      if (!combo) {
        this.errorMessage.set('No se encontró el combo solicitado.');
        return;
      }

      this.comboOriginal = combo;
      this.formCombo.patchValue({
        nombre: combo.nombre,
        descripcion: combo.descripcion ?? '',
        imagen: combo.imagen ?? '',
        destacado: combo.destacado ?? false,
        fechaInicio: combo.fecha_inicio?.slice(0, 10) ?? '',
        fechaFin: combo.fecha_fin?.slice(0, 10) ?? '',
      });
      this.items.clear();
      for (const item of combo.items ?? []) {
        this.items.push(new FormGroup({
          productoId: new FormControl<number | null>(item.producto_id, Validators.required),
          cantidad: new FormControl<number | null>(item.cantidad, [Validators.required, Validators.min(1)]),
        }));
      }
      if (this.items.length === 0) this.agregarItem();
      this.imagePreviewUrl = combo.imagen;
      const totalLista = this.totalPrecioLista;
      const porcentaje = totalLista > 0
        ? Math.max(0, Math.min(99, Number(((1 - combo.precio / totalLista) * 100).toFixed(2))))
        : 0;
      this.formCombo.controls.descuento.setValue(porcentaje);
      this.cdr.detectChanges();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo cargar el combo.');
    }
  }
}
