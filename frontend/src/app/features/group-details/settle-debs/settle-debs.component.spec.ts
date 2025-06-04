import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettleDebsComponent } from './settle-debs.component';

describe('SettleDebsComponent', () => {
  let component: SettleDebsComponent;
  let fixture: ComponentFixture<SettleDebsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettleDebsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SettleDebsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
