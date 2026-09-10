import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuestScreen } from './guest-screen';

describe('GuestScreen', () => {
  let component: GuestScreen;
  let fixture: ComponentFixture<GuestScreen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuestScreen],
    }).compileComponents();

    fixture = TestBed.createComponent(GuestScreen);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
