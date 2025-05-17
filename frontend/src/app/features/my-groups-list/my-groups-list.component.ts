import { Component, inject } from '@angular/core';
import { GroupListServiceStore } from './store/group-list.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BigNumberish } from 'ethers';
import { Router } from '@angular/router';

@Component({
  selector: 'app-my-groups-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [GroupListServiceStore],
  templateUrl: './my-groups-list.component.html',
  styleUrl: './my-groups-list.component.scss'
})
export class MyGroupsListComponent {

  showModal = false;
  newGroupName = '';
  newGroupMembers = '';

  private store: GroupListServiceStore = inject(GroupListServiceStore);
  private router: Router = inject(Router);

  public groups$ = this.store.groups$;

  constructor() {
    this.store.refreshAllGroups();
  }

  createGroup() {
    const members = this.newGroupMembers
      .split('\n')
      .map(addr => addr.trim())
      .filter(addr => addr);
    this.store.createGroup({ name: this.newGroupName, addresses: members });
    this.showModal = false;
    this.resetModal();
  }

  navigateToGroupPage(id: BigNumberish) {
    this.router.navigate(['groups', id.toString()]);
  }

  resetModal() {
    this.showModal = false;
    this.newGroupName = '';
    this.newGroupMembers = '';
  }

}
