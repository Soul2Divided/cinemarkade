import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddFuncion } from './add-funcion';

describe('AddFuncion', () => {
  let component: AddFuncion;
  let fixture: ComponentFixture<AddFuncion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddFuncion],
    }).compileComponents();

    fixture = TestBed.createComponent(AddFuncion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
