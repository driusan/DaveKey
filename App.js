// import 'react-native-gesture-handler';

import { Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import  GetAccessToken from './AccessToken';
import { Button, FlatList, RefreshControl, Pressable, StyleSheet, Text, View } from 'react-native';
import {useState,useEffect, useCallback, useContext, useRef} from 'react';
import { FlatListPost } from './Posts';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer, getStateFromPath, getPathFromState } from '@react-navigation/native';
import { AccountContext, useCalckeyAccount} from './Account';
import { MyProfile, OtherProfile } from './Profile';
import {Thread} from './Thread';
import { MenuProvider} from 'react-native-popup-menu';
import { useNotifications, NotificationsPage } from './Notifications';
import * as Notifications from 'expo-notifications';




const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function ActionsStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Timeline" component={Timeline} />
      <Stack.Screen name="Profile" component={OtherProfile} />
      <Stack.Screen name="Thread" component={Thread} />
    </Stack.Navigator>
  );
}
function Logout({navigation}) {
    const account = useContext(AccountContext);
    useEffect( () => {
        if (account == null || account.i == null) {
            return;
        } else {
            account.logout();
        }
        navigation.navigate('Home');
    }, [account]);
    return <View><Text>Logging out..</Text></View>;
}

function ActionsDrawer() {
      const account = useContext(AccountContext);
      const name = account.mentionName();
      const profileLink = name == '' ? null :
        <Drawer.Screen name={account.mentionName()} component={MyProfile} />;
      return (
          <Drawer.Navigator screenOptions={{ headerShown: false }}>
              {profileLink}
              <Drawer.Screen name="Home" component={ActionsStack} />
              <Drawer.Screen name="Notifications" component={NotificationsPage} />
              <Drawer.Screen name="Logout" component={Logout} />
          </Drawer.Navigator>
      );
}


function useTimeline(account, type) {
  const [posts, setPosts] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNo, setRefreshNo] = useState(0);

  const loadMore = (since, until) => {
      if (!account || !account.instance) {
          return;
      }
      const url = 'https://' + account.instance + "/api/notes/" + type + "-timeline";
      const params = {
        i: account.i,
      }
      if (until) {
          params['untilId'] = until;
      }
      if (since) {
          params['sinceId'] = since;
      }
      return fetch(url,
      {
          method: 'POST',
          headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
          },
          credentials: "omit",
          body: JSON.stringify(params)
      }).then(
        resp => {
            if (!resp.ok) {
                // throw new Error("Response code was " + resp.status);
            }
            return resp.json()
        }
      ).then( (json) => {
          if (json.error) {
              throw new Error(json);
          }
          if (until !== null) {
              setPosts([...posts, ...json]);
          } else if (since !== null) {
              setPosts([...json, ...posts]);
          } else {
              setPosts([...json]);
          }

          setRefreshing(false);
      }).catch( (e) => {
          setRefreshing(false);
          console.error('error loading ', refreshNo);
          console.error(e)
      });
  }
  useEffect( () => {
      if (!account || !account.i) {
          return;
      }
      loadMore(null, null);
  }, [account.instance, account.i, type, refreshNo]);
  return {
      posts: posts,
      isRefreshing: refreshing,
      refreshTimeline: () => {
          setRefreshNo(refreshNo+1);
      },
      moreBefore: () => {
          if (posts) {
              loadMore(posts[0].id, null);
          }
      },
      moreAfter: () => {
          if (posts) {
              loadMore(null, posts[posts.length-1].id);
          }
      }
  }
}

function BoostSelect(props) {
    return (
      <View style={styles.timelineContainer}>
             <Pressable onPress={() => props.setWithBoosts(true)}
                         style={props.withBoosts ? {...styles.timelineItem, backgroundColor: '#ddd'} : styles.timelineItem}
             >
               <Text style={styles.timelineText}>Boosts</Text>
             </Pressable>
             <Pressable onPress={() => props.setWithBoosts(false)}
                        style={!props.withBoosts ? {...styles.timelineItem, backgroundColor: '#ddd'} : styles.timelineItem}
             >
               <Text style={styles.timelineText}>No Boosts</Text>
             </Pressable>
      </View>
   );
}

function TimelineSelect(props) {
    // global, home, hybrid, recommended
    const icon = (display, icon, active) => {
        const style = display == active ?
            {...styles.timelineItem, backgroundColor: '#ddd'}
            : styles.timelineItem;
        return (
          <Pressable onPress={() => props.onChange(display)}
                     style={style}
          >
            <Text style={styles.timelineText}>{icon}</Text>
          </Pressable>
        );
    }
    return (
      <View style={styles.timelineContainer}>
        {icon('global',  '🌐', props.active)}
        {icon('local', '🏠', props.active)}
        {icon('hybrid', '💑', props.active)}
        {icon('recommended', '🌟', props.active)}
      </View>
    );
}

export default function App() {
    const account = useCalckeyAccount();
    useNotifications();
    return (
      <AccountContext.Provider value={account}>
      <MenuProvider style={{flex: 1}}>
        <NavigationContainer linking={{
            prefixes: ['calckey://'],
            config: {
                screens: {
                    "Home": {
                        screens: {
                            "Thread": "notes/:PostId",
                            "Profile" : "profiles/:ProfileId",
                        }
                    },
                }
            },
            subscribe(listener) {
              const onReceiveURL = (url) => {
                  console.log('received url', url)};

              // Listen to incoming links from deep linking
              const eventListenerSubscription = Linking.addEventListener('url subscribe', onReceiveURL);

              // Listen to expo push notifications
              const subscription = Notifications.addNotificationResponseReceivedListener(response => {
                const url = response.notification.request.content.data.url;
                // Let React Navigation handle the URL
                listener(url);
              });
            }
        }}>
          <ActionsDrawer account={account}/>
        </NavigationContainer>
      </MenuProvider>
      </AccountContext.Provider>
    );
}

function Timeline({navigation}) {
  const [timelineType, setTimelineType] = useState('hybrid');
  const account = useContext(AccountContext);
  const timeline = useTimeline(account, timelineType);
  const [includeBoosts, setIncludeBoosts] = useState(true);

  const onRefresh = useCallback(() => {
      timeline.moreBefore();
  }, [timeline, account, account.i, account.instance]);
  const profileNavigate = (profileId) => {
      if (!profileId) {
          return;
      }
      navigation.navigate('Profile', {
          ProfileId: profileId
      });
  }

  if (account.i == null) {
      return <GetAccessToken 
        onSuccess={(i, instance) => {
            account.login(i, instance);
        }}
      />;
  }
  let refreshControl = <RefreshControl refreshing={timeline.isRefreshing} onRefresh={onRefresh} enabled={true}/>;
  return (
    <SafeAreaView style={{flex: 1}}>
        <FlatList
           data={timeline.posts}
           renderItem={({item}) => <FlatListPost post={item} 
              onProfileClick={profileNavigate}
           />}
           ListHeaderComponent={
             <View>
               <TimelineSelect
                  onChange={setTimelineType}
                  active={timelineType}
                />
                <BoostSelect withBoosts={includeBoosts} setWithBoosts={setIncludeBoosts} />
             </View>
           }
           ListFooterComponent={<Button title="Load more" onPress={timeline.moreAfter} />}
           refreshControl={refreshControl}
           stickyHeaderIndices={[0]}
           stickyHeaderHiddenOnScroll={true}
        />
     <StatusBar style="auto" />
    </SafeAreaView>
  );
/*
return (
<SafeAreaView style={{flex: 1}}>
  <ScrollView style={styles.mainContainer}
              refreshControl={refreshControl}
              stickyHeaderIndices={[0]}
              stickyHeaderHiddenOnScroll={true}
               >

    <MainArea style={styles.flexer}
              timeline={timeline}
    />
  </ScrollView>
</SafeAreaView>
);
*/
}

const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: '#faf',
},
mainContainer: {
flex: 1,
backgroundColor: '#fff',
flexFlow: 'space-between',
flexDirection: 'column',
width: '100%',
},
flexer: {
  flex: 1,
},
timelineContainer: {
flexFlow: 'stretch',
flexDirection: 'row',
justifyContent: 'center',
borderWidth: 1,
backgroundColor: '#fff',
},
timelineItem: {
flex: 1,
borderColor: 'green',
borderStyle: 'solid',
borderWidth: 1,
},
timelineText: {
fontSize: 20,
textAlign: 'center',
},
actionsContainer: {
  flex: 1,
  // backgroundColor: '#fff',
}

});
