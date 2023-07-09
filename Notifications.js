import { Pressable, Image, SafeAreaView, FlatList, Text, View } from 'react-native';
import * as mfm from 'mfm-js';
import { FlatListPost, PostContext, PostAuthor } from './Posts';
import { useRef, useEffect, useState } from 'react';
import { useAPI } from './api';
import { formatUsername} from './utils';
import { useNavigation, useTheme } from '@react-navigation/native';
import MFM from './MFM';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

const NOTIFICATION_TASK = 'notification-fetch';

// can't useAPI in notifications, need to duplicate
// the logic from Account.js
async function backgroundAPI(endpoint, params) {
    const instance = await SecureStore.getItemAsync('instance');
    const i = await SecureStore.getItemAsync('i');

    if (!instance || !i) {
        console.warn('No credentials for API call.');
        return;
    }
    if (!instance) {
        throw new Error('No instance');
    }
    const url = 'https://' + instance + '/api/' + endpoint;
    const newParams = {
      i: i, 
      ...params,
    };
    console.log('background api', url);
    return fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: "omit",
        body: JSON.stringify(newParams)
    }).then( async resp => {
        if (resp.status == 204) {
            return {};
        }
        if (!resp.ok) {
            const text = await resp.text();
            throw new Error('Status ' + resp.status + ':' + text);
        }
        resp.json()
    });
}

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
    const instance = await SecureStore.getItemAsync('instance');
    const i = await SecureStore.getItemAsync('i');
    let lastNotif = null;
    const vals = await AsyncStorage.multiGet(['@lastNotificationId']);
    for(const obj of vals) {
        const [key, val] = obj;
        switch (key) {
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

Notifications.addNotificationResponseReceivedListener(response => {
  // const api = useAPI();
  const content = response.notification.request.content;
  console.log('clicked notification', response, content);

  console.log('notification type: ' + content.categoryIdentifier);
  switch (content.categoryIdentifier) {
  case 'mention': // fallthrough
  case 'reply':
    switch(response.actionIdentifier) {
    case 'like':
      console.log('action type: like');
      // FIXME: need access to server.defaultReaction
      backgroundAPI("notes/reactions/create", {
        noteId: content.data.noteId,
        reaction: '⭐'
      }).then ( (json) => {
        console.log(json);
      }).catch( (e) => console.warn(e));
      break;
    case 'boost':
      backgroundAPI("notes/create", {
        renoteId: content.data.noteId,
        visibility: 'public',
      }).then ( (json) => {
        console.log(json);
      });
      break;
    case 'reply':
      console.log('action type: reply');
      backgroundAPI("notes/create", {
        text: response.userText,
        poll: null,
        localOnly: false,
        visibility: content.data.visibility,
        replyId: content.data.noteId,
        visibileUserIds: content.data.visibleUserIds,
      }).then ( (json) => {
        Notifications.dismissNotificationAsync(response.notification.request.identifier);
      });
      break;
    default:
      console.log('unhandled action', response.actionIdentifier);
    }
    break;
  default:
    console.log('Unhandled notification category' + content.categoryIdentifier);
  }
});

BackgroundFetch.registerTaskAsync(NOTIFICATION_TASK, {
  minimumInterval: 1*60, // 1 minute
  stopOnTerminate: false,
  startOnBoot: true,
});

export function useNotifications() {
    useEffect(() => {
      Notifications.setNotificationCategoryAsync('reply', [
        {
          buttonTitle: 'Reply',
          identifier: 'reply',
          textInput: {
            submitButtonTitle: 'Send Reply',
          },
          options: {
            opensAppToForeground: false,
          },
        },
        {
          buttonTitle: `Like`,
          identifier: 'like',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          buttonTitle: 'Boost',
          identifier: 'boost',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);
      Notifications.setNotificationCategoryAsync('mention', [
        {
          buttonTitle: 'Reply',
          identifier: 'reply',
          textInput: {
            submitButtonTitle: 'Send Reply',
          },
          options: {
            opensAppToForeground: false,
          },
        },
        {
          buttonTitle: `Like`,
          identifier: 'like',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          buttonTitle: 'Boost',
          identifier: 'boost',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);
      return () => {
        // Notifications.removeNotificationSubscription(notificationListener.current);
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

export function NotificationsPage() {
    const api = useAPI();
    const theme = useTheme().colors;
    const [notifications, setNotifications] = useState(null);
    useEffect( () => {
        api.call("i/notifications", {
            excludeTypes: [],
            limit: 10,
            unreadOnly: false,
            markAsRead: false,
        }).then( (json) => {
            // console.log('got', json);
            let i = 0;
            /*
            for (obj of json) {
                if (obj.type == 'mention' || obj.type == 'reply') {
                    if (i < 3) {
                        scheduleNotification(obj);
                    }
                    i++;
                }
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
          ItemSeparatorComponent={(e) => <View style={{borderBottomWidth: 2, borderColor: theme.border, borderStyle: 'dotted', margin: 2}} />}

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
    const theme = useTheme().colors;
    const navigateTo = (id) => {
        navigation.navigate("Thread", { PostId: id});
    }
    const getNotificationContent = (notif) => {
        switch(notif.type) {
        case 'renote': 
            return <Pressable onPress={() => navigateTo(notif.note.renote.id)}><MFM onClick={()=>navigateTo(notif.note.renote.id)} text={notif.note.renote.text} /></Pressable>;
        case 'mention': // fallthrough
            //console.log(notif);
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
            return <View style={{flexDirection: 'row', textAlign: 'center'}}><Text style={{color: theme.text}}>Follow request accepted from </Text><PostAuthor user={props.notification.user} /></View>;
        case 'follow':
            return <View style={{flexDirection: 'row', textAlign: 'center'}}><Text style={{color: theme.text}}>Followed by </Text><PostAuthor user={props.notification.user} /></View>;
        case 'pollVote':
            return <View style={{flexDirection: 'row', textAlign: 'center'}}><Text style={{color: theme.text}}>{props.notification.user.name} voted in your poll.</Text></View>;
        case 'pollEnded':
            return <View style={{flexDirection: 'column', textAlign: 'center'}}><Text style={{color: theme.text}}>A poll you voted in has ended.</Text>
                <MFM onClick={() => navigateTo(notif.note.id)} text={notif.note.text} />
            </View>;
        default:
            return <Text style={{color: theme.text}}>Unhandled notification type {notif.type}</Text>
        }
    }
    const border = !props.notification.isRead ? <View style={{width: 10, backgroundColor: theme.border}} /> : null;
    const user = props.notification.user || props.notification.note.user;
    return <View style={{flex: 1, flexDirection: 'row', backgroundColor: theme.card}}>
        {border}
        <View style={{}}>
            <View style={{flexDirection: 'column', padding: 5, flex: 1}}>
               <View style={{paddingRight: 5}}>
               {user ? 
                 <Image style={{width: 40, height: 40}}
                   source={{ uri: user.avatarUrl}}
                 /> : <View style={{width: 40, height: 40}}><Text style={{fontSize: 36, color: theme.text}}>?</Text></View> }
               </View>
            </View>
         </View>
        <View style={{flex: 1}}>
               <View>
                 <Text style={{color: theme.text}}numberOfLines={1}>{ user ? user.name : 'Unknown user'}</Text>
               </View>
               <View>
                 <Text style={{color: theme.text}}numberOfLines={1}>{user ? formatUsername(user) : '??'}</Text>
               </View>
        </View>
        <View style={{flex: 8, flexDirection: 'column'}}>
          <View style={{flex: 1, padding: 2}}><Text style={{color: theme.text, fontWeight: 'bold', textAlign: 'center'}}>{props.notification.type}</Text></View>
          <View style={{flex: 1}}>{getNotificationContent(props.notification)}</View>
        </View>
    </View>;
}
