import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Resena } from './resena';

describe('Resena', () => {
    let component: Resena;
    let fixture: ComponentFixture<Resena>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Resena],
        }).compileComponents();

        fixture = TestBed.createComponent(Resena);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
