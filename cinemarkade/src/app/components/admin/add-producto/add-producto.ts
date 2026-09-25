import { Component, inject, ChangeDetectorRef, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute, Route } from '@angular/router';
import { CategoriaProducto } from '../../../core/producto/producto.model';
import { ProductoService } from '../../../core/producto/producto.service';
import { ProductoInput } from '../../../core/producto/producto.model';
import { Modal } from '../../modal/modal';
import { Loader } from '../../loader/loader';

@Component({
  imports: [ReactiveFormsModule, Modal, Loader],
  selector: 'app-add-producto',
  styleUrl: './add-producto.scss',
  templateUrl: './add-producto.html',
})
export class AddProducto implements OnInit {
  imagePreviewUrl: string | null = null;
  esEdicion = false;
  productoId: number | null = null;
  errorMessage: string = '';
  mostrarModal = signal<boolean>(false);
  mostrarLoader = signal<boolean>(false);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private productoService: ProductoService
  ) { }

  categorias: CategoriaProducto[] = ['COMIDA', 'BEBIDA', 'GOLOSINA', 'SNACK'];

  formProducto = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    imagen: new FormControl('', [Validators.required]),
    categoria: new FormControl<CategoriaProducto | ''>('', [Validators.required]),
    precio: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    descripcion: new FormControl('', [Validators.required])
  });

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.esEdicion = true;
      this.productoId = Number(idParam);
      await this.cargarProductoParaEditar(this.productoId);
    }
  }

  async cargarProductoParaEditar(id: number): Promise<void> {
    try {
      const prod = await this.productoService.obtenerPorId(id);
      if (prod) {
        this.formProducto.patchValue({
          nombre: prod.nombre,
          imagen: prod.imagen,
          categoria: prod.categoria,
          precio: prod.precio,
          descripcion: prod.descripcion
        });

        this.imagePreviewUrl = prod.imagen;
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Error al cargar producto para editar:', error);
    }
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result as string;
        this.formProducto.get('imagen')?.setValue(this.imagePreviewUrl);
        this.formProducto.get('imagen')?.markAsTouched();
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  removerImagen(event: Event): void {
    event.stopPropagation();
    this.imagePreviewUrl = null;
    this.formProducto.get('imagen')?.setValue('');
  }

  onUrlInput(event: Event): void {
    const url = (event.target as HTMLInputElement).value;
    this.imagePreviewUrl = url && (url.startsWith('http') || url.startsWith('data:image')) ? url : null;
  }

  seleccionarCategoria(categoria: CategoriaProducto): void {
    this.formProducto.get('categoria')?.setValue(categoria);
  }

  async onSubmit(): Promise<void> {
    if (!this.formProducto.valid) {
      this.formProducto.markAllAsTouched();
      this.triggerError('POR FAVOR COMPLETÁ TODOS LOS CAMPOS');
      return;
    }

    this.errorMessage = '';
    this.mostrarLoader.set(true);

    try {
      const valores = this.formProducto.getRawValue();
      const categoria = valores.categoria;
      if (!categoria || !this.categorias.includes(categoria as CategoriaProducto)) {
        throw new Error('Debe seleccionar una categoría válida');
      }

      const datos: ProductoInput = {
        nombre: valores.nombre ?? '',
        imagen: valores.imagen ?? '',
        categoria: categoria as CategoriaProducto,
        precio: valores.precio ?? 0,
        descripcion: valores.descripcion ?? '',
      };
      if (this.esEdicion && this.productoId) {
        await this.productoService.actualizarProducto(this.productoId, datos);
      } else {
        await this.productoService.crearProducto(datos);
      }
      this.mostrarModal.set(true);
    } catch (error) {
      this.triggerError(error instanceof Error
        ? error.message
        : 'No se pudo crear el producto');
    } finally {
      this.mostrarLoader.set(false);
    }
  }

  triggerError(msg: string): void {
    this.errorMessage = msg;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.formProducto.get(field);
    return !!(control && control.touched && control.invalid);
  }

  getFieldError(field: string): string {
    const control = this.formProducto.get(field);

    if (!control?.touched) {
      return '';
    }

    if (control.hasError('required')) {
      const requiredMessages: Record<string, string> = {
        nombre: 'El nombre es obligatorio',
        imagen: 'Debes seleccionar o ingresar una imagen',
        categoria: 'Debes seleccionar una categoría',
        precio: 'El precio es obligatorio',
        descripcion: 'La descripción es obligatoria'
      };

      return requiredMessages[field] ?? 'Este campo es obligatorio';
    }

    if (field === 'precio' && control.hasError('min')) {
      return 'El precio debe ser mayor a 0';
    }

    return '';
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.router.navigate(['/admin/peliculas']);
  }

  cancelar(): void {
    this.router.navigate(['/admin/productos']);
  }
}

