import { TestBed } from '@angular/core/testing';

import { TrustTokenService } from './trust-token.service';

describe('TrustTokenService', () => {
  let service: TrustTokenService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrustTokenService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
