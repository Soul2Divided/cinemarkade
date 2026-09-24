import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbmPelicula } from './abm-pelicula';

describe('AbmPelicula', () => {
  let component: AbmPelicula;
  let fixture: ComponentFixture<AbmPelicula>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbmPelicula],
    }).compileComponents();

    fixture = TestBed.createComponent(AbmPelicula);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
