import { Pressable, Image, SafeAreaView, FlatList, Text, View } from 'react-native';
import * as mfm from 'mfm-js';
import { FlatListPost, PostContext, PostAuthor } from './Posts';
import { useRef, useEffect, useState } from 'react';
import { useAPI } from './api';
import { formatUsername} from './utils';
import { useNavigation } from '@react-navigation/native';
import MFM from './MFM';
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
      markAsRead: false,
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
        minimumInterval: 5*60, // 1 minute
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
        title: 'Mentioned by ' + formatUsername(obj.user),
        body: obj.note.text,
        data: {
          notificationId: obj.id,
          noteId: obj.note.id,
          url: "calckey://notes/" + obj.user.id,
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

export function NotificationsPage() {
    const api = useAPI();
    const [notifications, setNotifications] = useState(null);
    useEffect( () => {
        api.call("i/notifications", {
            excludeTypes: [],
            limit: 10,
            unreadOnly: false,
            markAsRead: false,
        }).then( (json) => {
            console.log('got', json);
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
            console.error('error getting notifications', e);
        });
    }, []);
    if (notifications === null) {
        return (
            <SafeAreaView style={{flex: 1}}>
            <Text>Loading...</Text>
            </SafeAreaView>
        );
    }
    return (
      <SafeAreaView style={{flex: 1}}>
        <FlatList style={{flex: 1}} data={notifications || []}
          ItemSeparatorComponent={(e) => <View style={{borderBottomWidth: 2, borderColor: 'black', borderStyle: 'dotted', margin: 2}} />}

          renderItem={({item}) => <Notification notification={item} /> }
          />
      </SafeAreaView>
    );
}

function getReactionEmoji(name, emojis) {
    if (name.startsWith(':') && name.endsWith(':')) {
        const emojiname = name.substr(1, name.length-2);
        //console.log(emojiname, emojis);

        for (const emoji of (emojis || [])) {
            const ename = emoji.name.split('@');
            if (ename[0] == emojiname) {
                return <Image style={{width: 24, height: 24}} source={{ uri: emoji.url}} />
            }
        }
    }
    return <Text style={{fontSize: 24}}>{name}</Text>;
}

function Notification(props) {
    const navigation = useNavigation();
    const navigateTo = (id) => {
        navigation.navigate("Thread", { PostId: id});
    }
    const getNotificationContent = (notif) => {
        switch(notif.type) {
        case 'mention': // fallthrough
            //console.log(notif);
        case 'renote': // fallthrough
        case 'reply':
            return <Pressable onPress={() => navigateTo(notif.note.id)}><MFM onClick={()=>navigateTo(notif.note.id)} text={notif.note.text} /></Pressable>;
        case 'reaction':
            if (notif.reaction.startsWith(':')) {
                const mfmTree = mfm.parse(notif.reaction);
                //console.warn(mfmTree);
            }
            const emoji = getReactionEmoji(notif.reaction, notif.note.reactionEmojis);
            return <View style={{flexDirection: 'row'}}>
                <View style={{maxWidth: 40, justifyContent: 'center', padding: 1}}>
                    {emoji}
                </View>
                <MFM onClick={() => navigateTo(notif.note.id)} text={notif.note.text} />
            </View>;
        case 'followRequestAccepted':
        if (!props.notification.user) {
            console.log('wtf1');
        }
            return <View style={{flexDirection: 'row', textAlign: 'center'}}><Text>Follow request accepted from </Text><PostAuthor user={props.notification.user} /></View>;
        case 'follow':
        if (!props.notification.user) {
            console.log('wtf2');
        }
            return <View style={{flexDirection: 'row', textAlign: 'center'}}><Text>Followed by </Text><PostAuthor user={props.notification.user} /></View>;
        case 'pollVote':
        if (!props.notification.user) {
            console.log('wtf3');
        }
            return <View style={{flexDirection: 'row', textAlign: 'center'}}><Text>{props.notification.user.name} voted in your poll.</Text></View>;
        case 'pollEnded':
            return <View style={{flexDirection: 'column', textAlign: 'center'}}><Text>A poll you voted in has ended.</Text>
                <MFM onClick={() => navigateTo(notif.note.id)} text={notif.note.text} />
            </View>;
        default:
            return <Text>Unhandled notification type {notif.type}</Text>
        }
    }
    const border = !props.notification.isRead ? <View style={{width: 10, backgroundColor: '#449999'}} /> : null;
    const user = props.notification.user || props.notification.note.user;
    return <View style={{flex: 1, flexDirection: 'row'}}>
        {border}
        <View style={{}}>
            <View style={{flexDirection: 'column', padding: 5, flex: 1}}>
               <View style={{paddingRight: 5}}>
               {user ? 
                 <Image style={{width: 40, height: 40}}
                   source={{ uri: user.avatarUrl}}
                 /> : <View style={{width: 40, height: 40}}><Text style={{fontSize: 36}}>?</Text></View> }
               </View>
            </View>
         </View>
        <View style={{flex: 1}}>
               <View>
                 <Text numberOfLines={1}>{ user ? user.name : 'Unknown user'}</Text>
               </View>
               <View>
                 <Text numberOfLines={1}>{user ? formatUsername(user) : '??'}</Text>
               </View>
        </View>
        <View style={{flex: 8, flexDirection: 'column'}}>
          <View style={{flex: 1, padding: 2}}><Text style={{fontWeight: 'bold', textAlign: 'center'}}>{props.notification.type}</Text></View>
          <View style={{flex: 1}}>{getNotificationContent(props.notification)}</View>
        </View>
    </View>;
}
