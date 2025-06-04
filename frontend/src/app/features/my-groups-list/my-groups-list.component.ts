import { Component, inject } from '@angular/core';
import { GroupListServiceStore } from './store/group-list.store';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BigNumberish } from 'ethers';
import { Router } from '@angular/router';
import { JoinGroupComponent } from './join-group/join-group.component';

@Component({
  selector: 'app-my-groups-list',
  standalone: true,
  imports: [CommonModule, FormsModule, JoinGroupComponent],
  providers: [GroupListServiceStore],
  templateUrl: './my-groups-list.component.html',
  styleUrl: './my-groups-list.component.scss'
})
export class MyGroupsListComponent {

  showModal = false;
  joinGroupModal = false;
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

  joinGroup(groupId: BigNumberish) {
    this.store.requestToJoin(groupId);
    this.joinGroupModal = false;
  }

}
