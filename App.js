import { DrawerActions } from '@react-navigation/native';
import { Alert, Linking, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { en, registerTranslation } from 'react-native-paper-dates'
import { SafeAreaView } from 'react-native-safe-area-context';
import  GetAccessToken from './AccessToken';
import { Button, FlatList, RefreshControl, Pressable, StyleSheet, Text, View } from 'react-native';
import {useState,useEffect, useCallback, useContext, useRef} from 'react';
import { FlatListPost, CreatePostPage, UserList} from './Posts';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation, NavigationContainer, DefaultTheme, DarkTheme, useTheme} from '@react-navigation/native';
import { useWebSocket, AccountContext, useCalckeyAccount} from './Account';
import { MyProfile, OtherProfile } from './Profile';
import {Thread} from './Thread';
import { MenuProvider} from 'react-native-popup-menu';
import { useNotifications, NotificationsPage } from './Notifications';
import { DrivePage } from './Drive';
import { AnnouncementsPage } from './Announcements';
import * as Notifications from 'expo-notifications';
import { ServerContext } from './contexts';
import AntDesign from '@expo/vector-icons/AntDesign';
import {useAPI, useAPIPaginator} from './api';
import {ListsPage} from './Lists';
import {AntennasPage} from './Antennas';
import {BookmarksPage} from './Bookmarks';
import {SearchPage} from './Search';
import {GalleriesPage} from './Gallery';
import { PaperProvider, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import {PaginatedPostList} from './PaginationMenu';
import {reuseableActionsStack} from './actionsStack';


const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

function ActionsStack() {
  return (
    <Stack.Navigator screenOptions={{}}>
      <Stack.Screen options={{headerShown: false}} name="Timeline" component={Timelines} initialParams={{timelineType: 'hybrid'}}/>
      {reuseableActionsStack()}
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
      const navigation = useNavigation();
      const theme = useTheme().colors;
      const name = account.mentionName();
      const profileLink = null; 
      return (
          <Drawer.Navigator 
              id="drawer" 
              screenOptions={ ({navigation, route}) => {
                return {
                  headerLeft: () => {
                    const onPress = () => navigation.dispatch(DrawerActions.openDrawer());
                    return (
                      <View style={{paddingLeft: 5}}>
                        <Pressable onPress={onPress}>
                          <AntDesign name="bars" size={36} color={theme.text} />
                        </Pressable>
                      </View>
                    );
                  },
                  headerRight: () => {
                    const onPress = () => navigation.navigate("Search");
                    return (
                      <View style={{paddingRight: 15}}>
                        <Pressable onPress={onPress}>
                          <AntDesign name="search1" size={24} color={theme.text} />
                        </Pressable>
                      </View>
                    );
                  }
                };
              }}>
              {profileLink}
              <Drawer.Screen name="Home" component={ActionsStack} />
              <Drawer.Screen name="Notifications" component={NotificationsPage} />
              <Drawer.Screen name="Drive" component={DrivePage} />
              <Drawer.Screen name="Announcements" component={AnnouncementsPage} />
              <Drawer.Screen name="Bookmarks" component={BookmarksPage} />
              <Drawer.Screen name="Lists" component={ListsPage} />
              <Drawer.Screen name="Antennas" component={AntennasPage} />
              <Drawer.Screen name="Galleries" component={GalleriesPage} />
              <Drawer.Screen name="Search" component={SearchPage} />
              <Drawer.Screen name="Logout" component={Logout} />
          </Drawer.Navigator>
      );
}


function useTimeline(account, type) {
  const [posts, setPosts] = useState(null);
  const [streamedPosts, setStreamedPosts] = useState({
  });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNo, setRefreshNo] = useState(0);
  const onMessage = useCallback( (e) => {
          // console.log('Received message');
          const body = JSON.parse(e.data).body;
          if (body.id === 'timelineChannel') {
              // console.log('msg on timeline', body.body);
              setStreamedPosts([body.body, ...streamedPosts]);
          }
          // console.log('event listener in useTimeline', e);
  }, [streamedPosts, type]);
  useEffect( () => {
      if (!account.ws) {
          console.log('No websocket');
          return;
      }
      const ws = account.ws;
      const tlName = type + 'Timeline';
      console.log('Subscribing to websocket', '"' + type + 'Timeline"')
      if (ws.readyState == WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'connect',
            body: {
              'channel': type + 'Timeline',
              'id': tlName,
              'params': { },
            }
          }));
      }
      return () => {
          if (ws.readyState == WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'disconnect',
                body: {
                  'id': tlName,
                }
              }));
          }
      }
  }, [account, type, account.ws]);

  useEffect( () => {
      if (!account.ws) {
          return;
      }
      console.log('Adding event listener');
      const onMessage = (e) => {
          console.log('Received message');
          const body = JSON.parse(e.data).body;
          if (body.id === type + 'Timeline') {
              //console.log('msg on timeline ', type, body.body);
              if(!streamedPosts[type]) {
                  streamedPosts[type] = [body.body];
              } else {
                  streamedPosts[type] = [body.body, ...streamedPosts[type]];
              }
              // console.log('setting streamed posts', streamedPosts);
              setStreamedPosts({...streamedPosts});
          }
          // console.log('event listener in useTimeline', e);
      };
      account.ws.addEventListener('message', onMessage);
      return () => {
          account.ws.removeEventListener("message", onMessage);
      }
  }, [account.ws, streamedPosts, type]);

  const loadMore = (since, until) => {
      if (!account || !account.instance) {
          return;
      }
      const endpoint = (type == 'home' ? 'timeline' : type + '-timeline');
      const url = 'https://' + account.instance + "/api/notes/" + endpoint;
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
        async (resp) => {
            const text = await resp.text();
            try {
                return JSON.parse(text);
            } catch(e) {
                throw new Error("Response code was " + resp.status + ' returned' + text);
            }

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
      if (!account || !account.i || !type) {
          return;
      }
      loadMore(null, null);
  }, [account.instance, account.i, type, refreshNo]);
  return {
      unreadPosts: streamedPosts,
      posts: posts,
      isRefreshing: refreshing,
      addUnreadPosts: () => {
          const markerIndex = streamedPosts[type].length;
          console.log(type, streamedPosts);
          setPosts([...streamedPosts[type], ...posts]);
          streamedPosts[type] = [];
          setStreamedPosts({...streamedPosts});
          return markerIndex;
      },
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
    const theme = useTheme().colors;

    return (
      <View style={[styles.timelineContainer, {backgroundColor: theme.background}]}>
             <Pressable onPress={() => props.setWithBoosts(true)} style={[styles.timelineItem, {backgroundColor: theme.card}]}>
               <Text style={[styles.timelineText, {color: theme.text, fontWeight: props.withBoosts ? 'bold' : 'normal'}]
               }>Boosts</Text>
             </Pressable>
             <Pressable onPress={() => props.setWithBoosts(false)} style={[styles.timelineItem, {backgroundColor: theme.card}]}>
               <Text style={[styles.timelineText, {color: theme.text, fontWeight: props.withBoosts ? 'normal' : 'bold'}]}>No Boosts</Text>
             </Pressable>
      </View>
   );
}

function GetToken() {
    return <Stack.Navigator>
        <Stack.Screen name="Login" component={KeyAccessTokenScreen} />
    </Stack.Navigator>;
}
function KeyAccessTokenScreen() {
  const account = useContext(AccountContext);
  return (<GetAccessToken 
    onSuccess={(i, instance) => {
      console.log('logging in', i, instance);
      account.login(i, instance);
    }}
  />);
}

function getTheme(dark) {
    if (dark) {
        return {
            dark: true,
            colors: {
                ...DarkTheme.colors,
                card: 'rgb(40, 40, 40)',
            }
        };
    } else {
        return DefaultTheme
    }
}

export default function App() {
    const account = useCalckeyAccount();
    registerTranslation('en', en)
    const theme = useColorScheme();
    useNotifications();
    const [serverMeta, setServerMeta] = useState(null);
    useEffect( () => {
        if (!account) {
            return;
        }
        account.api("meta", {detail: false}).then( (json) => {
            console.log('got meta', json);
            setServerMeta(json);
        }).catch( (e) => console.error(e));
    }, [account.instance]);

    const { LightTheme, DarkTheme } = adaptNavigationTheme({
        reactNavigationLight: getTheme(false),
        reactNavigationDark: getTheme(true),
    });
    const screen = (!account || !account.i) ? <GetToken /> : <ActionsDrawer account={account}/>;
    return (
      <AccountContext.Provider value={account}>
      <ServerContext.Provider value={serverMeta}>
      <MenuProvider style={{flex: 1}}>
        <PaperProvider>
        <NavigationContainer
           theme={getTheme(theme=='dark')}
           linking={{
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
                  console.log('received url', url)
                  };

              // Listen to incoming links from deep linking
              const eventListenerSubscription = Linking.addEventListener('url subscribe', onReceiveURL);

              // Listen to expo push notifications
              const subscription = Notifications.addNotificationResponseReceivedListener(response => {
                const url = response.notification.request.content.data.url;
                // Let React Navigation handle the URL
                if (response.actionIdentifier == 'expo.modules.notifications.actions.DEFAULT') {
                    listener(url);
                }
              });
            }
        }}>
            {screen}
        </NavigationContainer>
        </PaperProvider>
      </MenuProvider>
      </ServerContext.Provider>
      </AccountContext.Provider>
    );
}

function Timelines() {
    const icon = (typ, color, size) => {
        let i;
        switch(typ) {
        case 'home':
            i = '👫'; break;
        case 'global':
            i = "🌐"; break;
        case 'local':
            i = '🏠'; break;
        case 'hybrid':
            i = '💑'; break;
        case 'recommended':
            i = '🌟'; break;
        }
        return <Text style={{width: size, height: size, color: color}}>{i}</Text>;
    }
    /*
        {icon('global',  '🌐', props.active)}
        {icon('local', '🏠', props.active)}
        {icon('hybrid', '💑', props.active)}
        {icon('recommended', '🌟', props.active)}
        */
    return (
      <Tab.Navigator screenOptions={{headerShown: false}}>
        <Tab.Screen name="Friends"
           options={
              {
                tabBarIcon: ({focused, color, size}) => icon('home', color, size)}
              }
            initialParams={{timelineType: 'home'}}
            component={Timeline} />
        <Tab.Screen name="Global"
           options={
              {
                tabBarIcon: ({focused, color, size}) => icon('global', color, size)}
              }
            initialParams={{timelineType: 'global'}}
            component={Timeline} />
        <Tab.Screen name="Hybrid"
           options={
              {
                tabBarIcon: ({focused, color, size}) => icon('hybrid', color, size)}
              }
            component={Timeline}
            initialParams={{timelineType: 'hybrid'}}
            />
        <Tab.Screen name="Local" component={Timeline}
           options={
              {
                tabBarIcon: ({focused, color, size}) => icon('local', color, size)}
              }
            initialParams={{timelineType: 'local'}}
        />
        <Tab.Screen name="Recommended" component={Timeline}
           options={
              {
                tabBarIcon: ({focused, color, size}) => icon('recommended', color, size)}
              }
              initialParams={{timelineType: 'recommended'}}

        />
      </Tab.Navigator>
    );
}

function uniq(a) {
    const seen = {};
    if (!a) {
        return a;
    }
    return a.filter(function(item) {
        if (seen.hasOwnProperty(item.id)) {
            return false;
        }
        seen[item.id] = true;
        return true;
    });
}

function NewPostMarker() {
    const theme = useTheme().colors;
    return (
      <View style={{fontWeight: 'bold', flexDirection: 'row', textAlign: 'center', padding: 10, margin: 5, justifyContent: 'space-between'}}>
        <View style={{flexDirection: 'row'}}>
            <AntDesign name="arrowup" size={24} color={theme.primary} style={{paddingRight: 10}}/>
            <Text style={{color: theme.primary, fontWeight: 'bold', textAlign: 'center'}}>New Posts</Text>
        </View>
        <View style={{flexDirection: 'row'}}>
            <Text style={{color: theme.primary, fontWeight: 'bold', textAlign: 'center'}}>Old Posts</Text>
            <AntDesign name="arrowdown" size={24} color={theme.primary} style={{paddingLeft: 10}}/>
        </View>
      </View>
    );
}
function Timeline({navigation, route}) {
  const account = useContext(AccountContext);
  const theme = useTheme().colors;
  const timeline = useTimeline(account, route.params?.timelineType);
  const [includeBoosts, setIncludeBoosts] = useState(true);
  const [newMarker, setNewMarker] = useState(null);
  const flatRef = useRef(null);
  useEffect(() => {
      if (newMarker !== null && flatRef.current) {
          // index is 0-indexed, newMarker is 1-indexed
          flatRef.current.scrollToIndex({
            index: newMarker-1,
            animated: true,
            viewPosition: 1, // align the bottom of the post so that the new post
                             // marker is visible
            viewOffset: 10,
          });
      }
  }, [newMarker]);
  console.log(route, route.params?.timelineType);

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

  let refreshControl = <RefreshControl refreshing={timeline.isRefreshing} onRefresh={onRefresh} enabled={true}/>;
  const displayedposts = includeBoosts ? timeline.posts : timeline.posts.filter((post) => post.text);
  const unreadPostNum = timeline.unreadPosts[route.params?.timelineType]?.length || 0

  return (
    <View style={{flex: 1}}>
        <FlatList
           ref={flatRef}
           data={uniq(displayedposts)}
           initialScrollIndex={newMarker}
           renderItem={({item, index}) => {
              return (
                <View>
                  {index == newMarker ? <NewPostMarker /> : null}
                  <FlatListPost post={item} 
                      doReply={(postId) => { navigation.push("Create Post", { replyTo: postId}) }}
                       onProfileClick={profileNavigate}
                />
                </View>
                );
           }}
           ItemSeparatorComponent={
               () => <View style={{padding: 5}} />
           }
           extraData={newMarker}
           ListHeaderComponent={
             <View>
                <BoostSelect withBoosts={includeBoosts} setWithBoosts={setIncludeBoosts} />
                {unreadPostNum > 0 ? (
                    <View style={{backgroundColor: theme.background}}>
                        <Button title={"Load " + unreadPostNum + " new posts"} onPress={() => {
                            setNewMarker(timeline.addUnreadPosts());
                        }}/>
                    </View>) : <View />
                }
             </View>
           }
           ListFooterComponent={<Button title="Load more" onPress={timeline.moreAfter} />}
           refreshControl={refreshControl}
           stickyHeaderIndices={[0]}
           stickyHeaderHiddenOnScroll={true}
           onEndReached={timeline.moreAfter}
           onEndReachedThreshold={0.7}
        />
        <View style={{position: 'absolute', bottom: 50, right: 50}}><Pressable onPress={() => navigation.push("Create Post", {})}><AntDesign name="pluscircle" size={48} color="green" /></Pressable></View>
     <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
    timelineContainer: {
        flexFlow: 'stretch',
        flexDirection: 'row',
        justifyContent: 'center',
        borderWidth: 1,
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
    }
});
