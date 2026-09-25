import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbmSala } from './abm-sala';

describe('AbmSala', () => {
  let component: AbmSala;
  let fixture: ComponentFixture<AbmSala>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbmSala],
    }).compileComponents();

    fixture = TestBed.createComponent(AbmSala);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
