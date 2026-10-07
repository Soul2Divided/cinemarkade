import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { CompraValidadaQr } from '../../../core/compra/compra.model';
import { CompraService } from '../../../core/compra/compra.service';
import { Loader } from '../../loader/loader';
import { Navbar } from '../../navbar/navbar';

interface ResultadoCodigo {
  rawValue: string;
}

interface DetectorQr {
  detect(video: HTMLVideoElement): Promise<ResultadoCodigo[]>;
}

type BarcodeDetectorNativo = new (options: { formats: string[] }) => DetectorQr;

@Component({
  imports: [CommonModule, Navbar, Loader],
  selector: 'app-escanear-entrada',
  styleUrl: './escanear-entrada.scss',
  templateUrl: './escanear-entrada.html',
})
export class EscanearEntrada implements OnDestroy {
  private readonly compraService = inject(CompraService);
  @ViewChild('preview') private preview?: ElementRef<HTMLVideoElement>;

  readonly escaneando = signal(false);
  readonly validando = signal(false);
  readonly error = signal('');
  readonly entrada = signal<CompraValidadaQr | null>(null);
  private stream: MediaStream | null = null;
  private detector: DetectorQr | null = null;
  private frameId: number | null = null;

  async iniciarEscaneo(): Promise<void> {
    this.error.set('');
    this.entrada.set(null);

    const detectorConstructor = (window as Window & { BarcodeDetector?: BarcodeDetectorNativo }).BarcodeDetector;
    if (!detectorConstructor) {
      this.error.set('Este navegador no permite leer códigos QR desde la cámara. Probá con Chrome o Edge actualizado.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.error.set('La cámara requiere una conexión segura HTTPS o localhost.');
      return;
    }

    this.escaneando.set(true);
    try {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });

      const video = this.preview?.nativeElement;

      if (!video) throw new Error('No se pudo abrir la vista de la cámara.');

      video.srcObject = this.stream;

      await video.play();

      this.detector = new detectorConstructor({ formats: ['qr_code'] });
      
      await this.leerSiguienteCuadro();
    } catch (error) {
      this.detenerCamara();
      this.error.set(error instanceof Error ? error.message : 'No se pudo acceder a la cámara. Revisá sus permisos.');
    }
  }

  async validarCodigo(codigo: string): Promise<void> {
    this.detenerCamara();
    this.validando.set(true);
    this.error.set('');
    try {
      const entrada = await this.compraService.validarQr(codigo.trim());
      if (!entrada) {
        this.error.set('La entrada no es válida, ya fue utilizada o no corresponde a una compra confirmada.');
        return;
      }
      this.entrada.set(entrada);
    } catch (error) {
      console.error('No se pudo validar el QR:', error);
      this.error.set(error instanceof Error ? error.message : 'No se pudo validar la entrada.');
    } finally {
      this.validando.set(false);
    }
  }

  nuevaLectura(): void {
    this.detenerCamara();
    this.entrada.set(null);
    this.error.set('');
  }

  formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
    if (!anio || !mes || !dia) return fecha;
    return new Date(anio, mes - 1, dia, 12).toLocaleDateString('es-AR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  ngOnDestroy(): void {
    this.detenerCamara();
  }

  private async leerSiguienteCuadro(): Promise<void> {
    const video = this.preview?.nativeElement;
    if (!this.escaneando() || !this.detector || !video) return;

    try {
      const codigos = await this.detector.detect(video);
      const codigo = codigos.find(item => item.rawValue)?.rawValue;
      if (codigo) {
        await this.validarCodigo(codigo);
        return;
      }
    } catch (error) {
      this.detenerCamara();
      this.error.set(error instanceof Error ? error.message : 'No se pudo leer el código QR.');
      return;
    }

    this.frameId = requestAnimationFrame(() => void this.leerSiguienteCuadro());
  }

  private detenerCamara(): void {
    this.escaneando.set(false);
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    this.detector = null;
    if (this.preview?.nativeElement) this.preview.nativeElement.srcObject = null;
  }
}
