import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbmProducto } from './abm-producto';

describe('AbmProducto', () => {
  let component: AbmProducto;
  let fixture: ComponentFixture<AbmProducto>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbmProducto],
    }).compileComponents();

    fixture = TestBed.createComponent(AbmProducto);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
