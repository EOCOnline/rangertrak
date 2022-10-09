import { TestBed } from '@angular/core/testing';

import { InstallablePromptService } from './installable.service';

describe('InstallablePromptService', () => {
  let service: InstallablePromptService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InstallablePromptService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
