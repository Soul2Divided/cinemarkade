import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { Compra } from './compra';
import { AuthService } from '../../auth/auth.service';
import { ComboService } from '../../core/combo/combo.service';
import { ProductoService } from '../../core/producto/producto.service';
import { CuponService } from '../../core/cupon/cupon.service';
import { TarifaFormatoService } from '../../core/tarifa-formato/tarifa-formato.service';
import { RecompensaService } from '../../core/recompensa/recompensa.service';
import { RecompensaRepository } from '../../core/recompensa/recompensa.repository';
import { Recompensa, RecompensaInput } from '../../core/recompensa/recompensa.model';

describe('Selección de recompensas en la compra', () => {
    const usuario = signal<{ puntos: number } | null>({ puntos: 40000 });
    const entrada: Recompensa = {
        id: 1,
        nombre: 'Dos entradas 3D',
        tipo: 'entrada',
        formato: '3D',
        producto_id: null,
        combo_id: null,
        cantidad: 2,
        costo_puntos: 15001,
        activa: true,
        version: 1
    };
    let compra: Compra;
    beforeEach(() => {
        usuario.set({ puntos: 40000 });
        TestBed.configureTestingModule({
            providers: [
                { provide: Router, useValue: { navigate: vi.fn() } },
                { provide: AuthService, useValue: { usuarioActual: usuario } },
                ...[ComboService, ProductoService, CuponService, TarifaFormatoService, RecompensaService].map(
                    provide => ({ provide, useValue: {} })
                )
            ]
        });
        compra = TestBed.runInInjectionContext(() => new Compra());
        sessionStorage.clear();
    });
    it('permite reemplazar las entradas en dinero por dos entradas canjeadas y guarda ambas butacas requeridas', () => {
        compra.cambiarRecompensa(entrada, 1);
        compra.cambiarCantidadEntradas(-1);
        expect(compra.entradasTotales()).toBe(2);
        expect(compra.subtotalEntradas()).toBe(0);
        expect(compra.puntosUsados()).toBe(15001);
        compra.seleccion.set({
            peliculaId: 1,
            funcionId: 1,
            proyeccionId: 1,
            fecha: '2099-01-01',
            horario: '20:00',
            formato: '3D',
            idioma: 'Castellano',
            salaId: 1
        });
        compra.tarifaBase.set(5000);
        compra.continuar();
        const borrador = JSON.parse(sessionStorage.getItem('cinemarkade-compra-borrador')!);
        expect(borrador.cantidadEntradas).toBe(2);
        expect(borrador.entradas).toHaveLength(2);
        expect(
            borrador.entradas.every(
                (e: { medio_pago: string; recompensa_id: number }) => e.medio_pago === 'puntos' && e.recompensa_id === 1
            )
        ).toBe(true);
        expect(borrador.solicitudId).toBeTruthy();
    });
    it('no permite gastar más puntos de los disponibles ni usar los puntos de la compra actual', () => {
        usuario.set({ puntos: 10000 });
        compra.precioEntrada.set(40000);
        compra.cambiarRecompensa(entrada, 1);
        expect(compra.puntosUsados()).toBe(0);
        expect(compra.mensajeContinuar()).toContain('suficientes');
    });
    it('mantiene el máximo de ocho butacas y restaura una entrada al quitar el último canje', () => {
        compra.cantidadEntradas.set(8);
        compra.cambiarRecompensa(entrada, 1);
        expect(compra.cantidadEntradas()).toBe(6);
        expect(compra.entradasTotales()).toBe(8);
        compra.cantidadEntradas.set(0);
        compra.cambiarRecompensa(entrada, -1);
        expect(compra.entradasTotales()).toBe(1);
    });
    it('bloquea continuar si cambió el saldo o cerró sesión y no otorga puntos al anónimo', () => {
        compra.cambiarRecompensa(entrada, 1);
        usuario.set(null);
        compra.precioEntrada.set(40000);
        expect(compra.puntosEstimados()).toBe(0);
        compra.seleccion.set({
            peliculaId: 1,
            funcionId: 1,
            proyeccionId: 1,
            fecha: '2099-01-01',
            horario: '20:00',
            formato: '3D',
            idioma: 'Castellano',
            salaId: 1
        });
        compra.tarifaBase.set(5000);
        compra.continuar();
        expect(sessionStorage.getItem('cinemarkade-compra-borrador')).toBeNull();
    });
});

describe('Validación de recompensas administradas', () => {
    const guardar = vi.fn().mockResolvedValue(undefined);
    let service: RecompensaService;
    const datos: RecompensaInput = {
        nombre: '  Dos 3D  ',
        tipo: 'entrada',
        formato: '3D',
        producto_id: 1,
        combo_id: 1,
        cantidad: 2,
        costo_puntos: 15001,
        activa: true
    };
    beforeEach(() => {
        guardar.mockClear();
        TestBed.configureTestingModule({
            providers: [{ provide: RecompensaRepository, useValue: { guardar } }]
        });
        service = TestBed.inject(RecompensaService);
    });
    it('guarda el costo configurado sin derivarlo del precio en dinero y normaliza referencias', async () => {
        await service.guardar(datos);
        expect(guardar).toHaveBeenCalledWith(
            { ...datos, nombre: 'Dos 3D', producto_id: null, combo_id: null },
            undefined
        );
    });
    it('rechaza fracciones, cantidades excesivas y artículos sin referencia válida', () => {
        expect(() => service.guardar({ ...datos, costo_puntos: 1.5 })).toThrow('entero');
        expect(() => service.guardar({ ...datos, cantidad: 9 })).toThrow('cantidad');
        expect(() => service.guardar({ ...datos, tipo: 'producto', producto_id: 0 })).toThrow('Seleccioná');
        expect(guardar).not.toHaveBeenCalled();
    });
});
