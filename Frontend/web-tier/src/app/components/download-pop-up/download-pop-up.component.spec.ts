import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DownloadPopUpComponent } from './download-pop-up.component';

describe('DownloadPopUpComponent', () => {
  let component: DownloadPopUpComponent;
  let fixture: ComponentFixture<DownloadPopUpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DownloadPopUpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DownloadPopUpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
