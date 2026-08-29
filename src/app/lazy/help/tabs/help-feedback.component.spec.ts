import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HelpFeedbackComponent } from './help-feedback.component';

describe('HelpFeedbackComponent', () => {
  let component: HelpFeedbackComponent;
  let fixture: ComponentFixture<HelpFeedbackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // provideHttpClient(+Testing) for the embedded feedback form; provideRouter for the
      // routerLink="/log" link inside the folded-in Log section.
      imports: [HelpFeedbackComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
      .compileComponents();

    fixture = TestBed.createComponent(HelpFeedbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // D-d, F29-26 (2026-08-29): this tab took over both the feedback form (moved on again from
  // About, which briefly carried it after F29-25/0.78.0) and the Log tab it replaced.
  it('carries the feedback form and a link to the Log page', () => {
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain("What's on your mind?");
    const link: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector('a[href="/log"]');
    expect(link).not.toBeNull();
  });
});
