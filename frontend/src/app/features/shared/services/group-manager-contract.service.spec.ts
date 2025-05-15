import { TestBed } from '@angular/core/testing';

import { GroupManagerContractService } from './group-manager-contract.service';

describe('GroupManagerContractService', () => {
  let service: GroupManagerContractService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GroupManagerContractService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
