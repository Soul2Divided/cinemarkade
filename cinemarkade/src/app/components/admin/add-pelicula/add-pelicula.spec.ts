import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddPelicula } from './add-pelicula';

describe('AddPelicula', () => {
  let component: AddPelicula;
  let fixture: ComponentFixture<AddPelicula>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddPelicula],
    }).compileComponents();

    fixture = TestBed.createComponent(AddPelicula);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
