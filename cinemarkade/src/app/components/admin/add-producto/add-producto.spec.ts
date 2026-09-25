import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddProducto } from './add-producto';

describe('AddProducto', () => {
  let component: AddProducto;
  let fixture: ComponentFixture<AddProducto>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddProducto],
    }).compileComponents();

    fixture = TestBed.createComponent(AddProducto);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
