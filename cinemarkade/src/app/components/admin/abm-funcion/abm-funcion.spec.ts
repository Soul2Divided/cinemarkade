import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbmFuncion } from './abm-funcion';

describe('AbmFuncion', () => {
  let component: AbmFuncion;
  let fixture: ComponentFixture<AbmFuncion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbmFuncion],
    }).compileComponents();

    fixture = TestBed.createComponent(AbmFuncion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
