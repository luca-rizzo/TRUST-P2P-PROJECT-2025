import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AddressLike } from 'ethers';

@Component({
  selector: 'app-pending-join-req',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-join-req.component.html',
  styleUrl: './pending-join-req.component.scss'
})
export class PendingJoinReqComponent {
  
  @Input() pendingAddress: AddressLike[] = [];
  @Output() approve = new EventEmitter<AddressLike>();

  approveUser(address: AddressLike) {
    this.approve.emit(address);
  }
}
