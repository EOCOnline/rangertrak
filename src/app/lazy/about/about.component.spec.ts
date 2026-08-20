import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  let component: AboutComponent;
  let fixture: ComponentFixture<AboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ AboutComponent ],
      // For the routerLink="/log" help link (E-57(1): Log moved off the main menu,
      // reachable from here instead).
      providers: [ provideRouter([]) ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // E-57(1): "Rename the About page to Help... and put a link to the Log page there,
  // but not link to Log from the main menu."
  it('is headed "Help", not "About"', () => {
    const h2 = fixture.nativeElement.querySelector('h2');
    expect(h2.textContent.trim()).toBe('Help');
  });

  it('links to the Log page', () => {
    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a[href="/log"]');
    expect(link).not.toBeNull();
  });
});
