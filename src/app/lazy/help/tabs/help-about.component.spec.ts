import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HelpAboutComponent } from './help-about.component';

describe('HelpAboutComponent', () => {
  let component: HelpAboutComponent;
  let fixture: ComponentFixture<HelpAboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // provideRouter for the routerLink="/log" link below.
      imports: [HelpAboutComponent],
      providers: [provideRouter([])]
    })
      .compileComponents();

    fixture = TestBed.createComponent(HelpAboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // E-57(1): "...and put a link to the Log page there, but not link to Log from the main
  // menu." F29-25 (2026-08-29) moved the About/feedback/How-it's-built content that used to
  // sit below the tab group (repeating under every tab) into this, the tab it describes.
  it('links to the Log page', () => {
    const link: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector('a[href="/log"]');
    expect(link).not.toBeNull();
  });

  it('carries the Send Feedback and How it is built sections', () => {
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Send Feedback');
    expect(text).toContain('How it is built');
  });
});
