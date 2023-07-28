import * as Notifications from 'expo-notifications';

export function formatUsername(user) {
    if (user.host) {
        return '@' + user.username + '@' + user.host;
    }
    return '@' + user.username;
}

export function scheduleNotification(obj) {
  switch(obj.type) {
  case 'reaction':
    Notifications.scheduleNotificationAsync({
      content: {
        title: obj.reaction + " reaction by " + formatUsername(obj.user),
        body: obj.note.text,
        data: {
          notificationId: obj.id,
          noteId: obj.note.id,
          url: "calckey://notes/" + obj.note.id,
        }
      },
      trigger: null,
    });
    break;
  case 'followRequestAccepted':
    // open profile? 
    Notifications.scheduleNotificationAsync({
      content: {
        title: formatUsername(obj.user) + ' follow request accepted',
        data: {
          notificationId: obj.id,
          url: "calckey://profiles/" + obj.user.id,
        },
      },
      trigger: null,
    });
    break;
  case 'reply':
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Reply from ' + formatUsername(obj.user),
        body: obj.note.text,
        data: {
          notificationId: obj.id,
          noteId: obj.note.id,
          url: "calckey://notes/" + obj.note.id,
          visibility: obj.note.visibility,
          visibileUserIds: obj.note.visibleUserIds,
        },
        categoryIdentifier: "reply",
      },
      trigger: null,
    });
    break;
  case 'follow':
    // open profile? follow back?
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Followed by ' + formatUsername(obj.user),
        data: {
          notificationId: obj.id,
          url: "calckey://profiles/" + obj.user.id,
        },

      },
      trigger: null,
    });
    break;
  case 'mention':
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Mentioned by ' + formatUsername(obj.user),
        body: obj.note.text,
        data: {
          notificationId: obj.id,
          noteId: obj.note.id,
          url: "calckey://notes/" + obj.note.id,
          visibility: obj.note.visibility,
          visibileUserIds: obj.note.visibleUserIds,
        },
        categoryIdentifier: "mention",
      },
      trigger: null,
    });
    break;
  default:
    console.log('unhandled notification type', obj.type);
  }
}
