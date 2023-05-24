import { SafeAreaView, FlatList, Text, View } from 'react-native';
import { FlatListPost, PostContext, PostAuthor } from './Posts';
import { useRef, useEffect, useState } from 'react';
import { useAPI } from './api';
import { formatUsername} from './utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

const NOTIFICATION_TASK = 'notification-fetch';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});


TaskManager.defineTask(NOTIFICATION_TASK, async () => {
    const now = Date.now();
    // get last task id from AsyncStorage

    console.log(`Got background fetch call at date: ${new Date(now).toISOString()}`);

    try {
      const notifs = await getNotificationsBackground();
      if (notifs.length == 0) {
        console.log('No new notifications');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }
      for(obj of notifs) {
        scheduleNotification(obj);
      }
      await AsyncStorage.setItem('@lastNotificationId', notifs[notifs.length-1].id);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (e) {
        console.warn('Background fetch failed', e);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

async function getNotificationsBackground() {
    let instance = null;
    let i = null;
    let lastNotif = null;
    const vals = await AsyncStorage.multiGet(['@i', '@instance', '@lastNotificationId']);
    for(const obj of vals) {
        const [key, val] = obj;
        switch (key) {
            case '@instance': instance = val; break;
            case '@i': i = val; break;
            case '@lastNotificationId': lastNotif = val; break;
        }
    }
    if (!instance || !i) {
        console.warn('No credentials to check for notifications');
        return;
    }
    const params = {
      i: i,
      excludeTypes: [],
      limit: 3,
      unreadOnly: true,
      markAsread: false,
    };
    // avoid re-sending notifications that were sent on previous background
    // fetches but not yet read.
    if (lastNotif) {
        params['sinceId'] = lastNotif;
    }

    // can't useAPI() or useAccount() because it's a background task
    // and not a component, can't use hooks
    return fetch("https://" + instance + "/api/i/notifications", {
          method: 'POST',
          headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
          },
          credentials: "omit",
          body: JSON.stringify(params)
        }).then( resp => {
            if (!resp.ok) {
                throw new Error('Failed to get notifications');
            }
            return resp.json()
        });
};

export function useNotifications() {
    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
         // console.log(notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
         console.log('clicked notification', response, response.notification.request.content);
      });
      // console.log('Registering task');
      BackgroundFetch.registerTaskAsync(NOTIFICATION_TASK, {
        minimumInterval: 1*60, // 1 minute
        stopOnTerminate: false,
        startOnBoot: true,
        });

      return () => {
        Notifications.removeNotificationSubscription(notificationListener.current);
        Notifications.removeNotificationSubscription(responseListener.current);
        // BackgroundFetch.unregisterTaskAsync(NOTIFICATION_TASK);
      }
    }, []);
}

function scheduleNotification(obj) {
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
    Notifications.scheduleNotificationAsync({
      content: {
        title: formatUsername(obj.user) + ' follow request accepted',
        data: {
          notificationId: obj.id,
          url: "calckey://profiles/" + obj.user.id,
        }
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
        }
      },
      trigger: null,
    });
    break;
  case 'follow':
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Followed by ' + formatUsername(obj.user),
        data: {
          notificationId: obj.id,
          url: "calckey://profiles/" + obj.user.id,
        }
      },
      trigger: null,
    });
    break;
  case 'mention':
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Mentioned by by ' + formatUsername(obj.user),
        body: obj.note.text,
        data: {
          notificationId: obj.id,
          noteId: obj.note.id,
          url: "calckey://notes/" + obj.user.id,
        }
      },
      trigger: null,
    });
    break;
  default:
    console.log(obj.type);
  }
}

export function NotificationsPage() {
    const api = useAPI();
    const [notifications, setNotifications] = useState([]);
    useEffect( () => {
        api.call("i/notifications", {
            excludeTypes: [],
            limit: 10,
            unreadOnly: false,
            markAsread: false,
        }).then( (json) => {
            //console.log('got', json);
            // FIXME: Other notification types
            // FIXME: Make background task
            /*
            for (obj of json) {
                if (obj.isRead) {
                    continue;
                }
                scheduleNotification(obj);
            }
            */
            setNotifications(json);
        }).catch((e) => {
            console.error(e);
        });
    }, []);
  const [isRegistered, setIsRegistered] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    checkStatusAsync();
  }, []);

  const checkStatusAsync = async () => {
      const status = await BackgroundFetch.getStatusAsync();
      const isRegistered = await TaskManager.isTaskRegisteredAsync(NOTIFICATION_TASK);
      setStatus(status);
      setIsRegistered(isRegistered);
  };
  console.log('notifs', notifications);
    return (
      <SafeAreaView style={{flex: 1}}>
        <View><Text>Notification Status: {status} Registered: {isRegistered ? 'true' : 'false'}</Text></View>
        <FlatList style={{flex: 1}} data={notifications}
          ItemSeparatorComponent={(e) => <View style={{borderBottomWidth: 2, borderColor: 'black', borderStyle: 'dotted', margin: 2}} />}

          renderItem={({item}) => <Notification notification={item} /> }
          />
      </SafeAreaView>
    );
}

function Notification(props) {
    switch (props.notification.type) {
    case 'reply':
        return <FlatListPost post={props.notification.note} />;
    case 'reaction':
        return (
          <View style={{flexDirection: 'column'}}>
           <FlatListPost post={props.notification.note} noBorder={true}/>
           <View style={{flexDirection: 'row'}}>
              <Text>{props.notification.reaction} by </Text>
              <PostAuthor user={props.notification.user} />
           </View>
        </View>
        );
    case 'followRequestAccepted':
        return <View style={{flexDirection: 'row', textAlign: 'center'}}><Text>Follow request accepted from </Text><PostAuthor user={props.notification.user} /></View>;
    case 'follow':
        return <View style={{flexDirection: 'row', textAlign: 'center'}}><Text>Followed by </Text><PostAuthor user={props.notification.user} /></View>;
    case 'mention':
        return (
          <View style={{flexDirection: 'column'}}>
            <View style={{flexDirection: 'row', textAlign: 'center'}}>
              <Text>Mentioned by </Text><PostAuthor user={props.notification.user} />
            </View>
            <FlatListPost post={props.notification.note} noBorder={true}/>
          </View>
        );
    default:
        return <View><Text>Unhandled notification type {props.notification.type}</Text></View>;
    }
}
