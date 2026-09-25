import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddSala } from './add-sala';

describe('AddSala', () => {
  let component: AddSala;
  let fixture: ComponentFixture<AddSala>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddSala],
    }).compileComponents();

    fixture = TestBed.createComponent(AddSala);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
