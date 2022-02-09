import { TestBed } from '@angular/core/testing';

import { ThreeWordsService } from './three-words.service';

describe('threeWwordsService', () => {
  let service: ThreeWordsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThreeWordsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
