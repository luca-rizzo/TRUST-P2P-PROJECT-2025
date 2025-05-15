import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { tapResponse } from '@ngrx/operators';
import { Observable, delay, distinctUntilChanged, exhaustMap, filter, map, switchMap, tap, withLatestFrom } from 'rxjs';
import { NotificationDataUI } from "..//models/notification-data-ui";
import { NotificationChangeSet } from "../models/notification-changeset";
import { NotificationData } from '../models/notification-data';
import { NotificationCenterServiceWs } from "../services/notification-center.service-ws";
import { NotificationFacadeService } from "../services/notification-facade.service";
import { mapToUIData } from '../utilities/data-to-dataui.utilities';
import { NotificationCenterState } from './notification-center.state';

interface GroupMetadata {
  groupId: number;
  description: string;
}

interface GroupListState {
    groups: GroupMetadata[];
    errorMessage: ''
}

@Injectable()
export class GroupListServiceStore extends ComponentStore<GroupListState> {

  

  constructor() {
    const initialState: GroupListState = { groups: [], errorMessage: '' };
    super(initialState);
  }

  readonly groups$: Observable<GroupMetadata[]> = this.select(state => state.groups);

  readonly errorMessage$: Observable<string> = this.select(state => state.errorMessage);

  readonly startToListenForElaborationsNotifications = this.effect<void>(() =>
    this._notificationFacadeService.notificationChangeSet$.pipe(
      tapResponse(
        (notificationChangeSet: NotificationChangeSet) => {
          this.handleNotificationChangeSet(notificationChangeSet);
        },
        (error: HttpErrorResponse) => this.patchState({ errorMessage: error.error })
      ))
  );

  readonly closeCenterWhenNewArrive = this.effect<void>(() =>
    this._notificationFacadeService.notificationForPopup$.pipe(
      tap(() => this.patchState({ isOpen: false }))
    )
  );

  readonly readLostNotificationsWhenDbChanged = this.effect<void>(() =>
    this._datasourceRetriverService.retrieveCurrentDatasourceState()
      .pipe(
        map(d => d?.id),
        filter(Boolean),
        distinctUntilChanged(),
        switchMap(_ => this._notificationCenterWs.getAllNotifications().pipe(
          tapResponse(
            (notifications: NotificationData[]) => {
              this.patchState({
                notifications: notifications,
                errorMessage: ''
              })
            },
            (error: HttpErrorResponse) => this.patchState({ errorMessage: error.error })
          ))
        )
      )
  );

  readonly refreshAllGroups = this.effect<void>(trigger$ => trigger$.pipe(
    switchMap(() => {

    })
  ));

    readonly setGroups = this.updater((state, groups: GroupMetadata[]) => ({
    ...state,
    groups: groups
  }));


  readonly clearMessage = this.effect<string>(id$ =>
    id$.pipe(
      withLatestFrom(this.notificationFixed$),
      filter(([id, notificationsFixed]) => !notificationsFixed.some(n => n.oid === id)),
      switchMap(([id, _]) => this._notificationCenterWs.deleteNotification(id).pipe(
        tapResponse(
          () => this._clearNotifications([id]),
          (error: HttpErrorResponse) => this.patchState({ errorMessage: error.error })
        )
      ))
    )
  );

  readonly modifyIsOpen = this.updater((state, isOpen: boolean) => ({
    ...state,
    isOpen: isOpen
  }));

  private readonly addNotifications = this.updater((state, notifications: NotificationData[]) => ({
    ...state,
    errorMessage: '',
    notifications: [...notifications, ...state.notifications]
  }));


  private readonly _setAllAsRead = this.updater((state) => ({
    ...state,
    errorMessage: '',
    notifications: state.notifications.map(n => { n.letto = true; return n })
  }));

  private readonly _updateNotificationData = this.updater((state, updatedNotificationsData: NotificationData[]) => ({
    ...state,
    errorMessage: '',
    notifications: state.notifications.map(curr => {
      const updatedNotification = updatedNotificationsData.find(un => un.oid === curr.oid);
      return updatedNotification ?? curr;
    })
  }));

  private readonly _clearNotifications = this.updater((state, idNotifications: string[]) => {
    const newMessages = this.removeMessageWithId(state.notifications, idNotifications);
    return ({
      ...state,
      errorMessage: '',
      notifications: newMessages
    });
  });

  private notificationToReadCount(notificationsData: NotificationData[]): number {
    return notificationsData.filter(notification => !notification.letto).length;
  }

  private removeMessageWithId(originalMessages: NotificationData[], ids: string[]): NotificationData[] {
    return originalMessages.filter(mess => !ids.includes(mess.oid));
  }

  private handleNotificationChangeSet(notificationChangeSet: NotificationChangeSet) {
    this.handleAdded(notificationChangeSet.added);
    this.handleDeleted(notificationChangeSet.deleted);
    this.handleUpdated(notificationChangeSet.edited);
  }

  private handleUpdated(edited: NotificationData[]) {
    this._updateNotificationData(edited);
  }

  private handleDeleted(deleted: NotificationData[]) {
    const notificationToDeleteIds = deleted.map(d => d.oid);
    this._clearNotifications(notificationToDeleteIds);
  }

  private handleAdded(added: NotificationData[]) {
    this.addNotifications(added);
  }

}