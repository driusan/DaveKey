import { DrawerActions } from '@react-navigation/native';
import { Alert, Linking, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import  GetAccessToken from './AccessToken';
import { Button, FlatList, RefreshControl, Pressable, StyleSheet, Text, View } from 'react-native';
import {useState,useEffect, useCallback, useContext, useRef} from 'react';
import { FlatListPost, PostModal, UserList } from './Posts';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation, NavigationContainer, DefaultTheme, DarkTheme, useTheme} from '@react-navigation/native';
import { AccountContext, useCalckeyAccount} from './Account';
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

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

function ActionsStack() {
  return (
    <Stack.Navigator screenOptions={{}}>
      <Stack.Screen options={{headerShown: false}} name="Timeline" component={Timelines} initialParams={{timelineType: 'hybrid'}}/>
      <Stack.Screen options={{headerShown: false}} name="Profile" component={OtherProfile} />
      <Stack.Screen name="Thread" component={Thread} />
      <Stack.Screen name="Hashtag" options={({navigation, route}) => {
          const tag = route.params?.Tag;
          return { title: tag ? '#' + tag : 'Hashtag'};

      }} component={HashtagPage} />
    </Stack.Navigator>
  );
}

function HashtagPage({navigation, route}) {
    const account = useContext(AccountContext);
    const tag = route.params?.Tag;
    // hashtags/users doesn't support pagination
    const posts = useAPIPaginator("notes/search-by-tag", {tag: tag});
    const [postModalVisible, setPostModalVisible] = useState(false);
    const [postReplyId, setPostReplyId] = useState(null);

  let refreshControl = <RefreshControl refreshing={posts.isRefreshing} onRefresh={posts.refresh} enabled={true}/>;
   return (<View>
        <FlatList
           data={posts.data}
           renderItem={({item}) => <FlatListPost post={item} 
              doReply={(postId) => { setPostReplyId(postId); setPostModalVisible(true); }}
              onProfileClick={() => {}}
           />}
           ListHeaderComponent={
             <View>
               <PostModal show={postModalVisible} replyTo={postReplyId} onClose={() => { setPostReplyId(null); setPostModalVisible(false)}} />
             </View>
           }
           ListFooterComponent={<Button title="Load more" onPress={posts.moreAfter} />}
           refreshControl={refreshControl}
           stickyHeaderIndices={[0]}
           stickyHeaderHiddenOnScroll={true}
        />
      </View>);
    return <View><UserList users={users.data} onProfileClick={() => {}} tag={tag} loadMore={users.moreAfter}/></View>;
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
                };
              }}>
              {profileLink}
              <Drawer.Screen name="Home" component={ActionsStack} />
              <Drawer.Screen name="Notifications" component={NotificationsPage} />
              <Drawer.Screen name="Drive" component={DrivePage} />
              <Drawer.Screen name="Announcements" component={AnnouncementsPage} />
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

    const screen = (!account || !account.i) ? <GetToken /> : <ActionsDrawer account={account}/>;
    return (
      <AccountContext.Provider value={account}>
      <ServerContext.Provider value={serverMeta}>
      <MenuProvider style={{flex: 1}}>
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
function Timeline({navigation, route}) {
  const account = useContext(AccountContext);
  const timeline = useTimeline(account, route.params?.timelineType);
  const [includeBoosts, setIncludeBoosts] = useState(true);
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [postReplyId, setPostReplyId] = useState(null);
  console.log(route);

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
  return (
    <View style={{flex: 1}}>
        <FlatList
           data={displayedposts}
           renderItem={({item}) => <FlatListPost post={item} 
              doReply={(postId) => { setPostReplyId(postId); setPostModalVisible(true); }}
              onProfileClick={profileNavigate}
           />}
           ItemSeparatorComponent={
               () => <View style={{padding: 5}} />
           }
           ListHeaderComponent={
             <View>
               <PostModal show={postModalVisible} replyTo={postReplyId} onClose={() => { setPostReplyId(null); setPostModalVisible(false)}} />
                <BoostSelect withBoosts={includeBoosts} setWithBoosts={setIncludeBoosts} />
             </View>
           }
           ListFooterComponent={<Button title="Load more" onPress={timeline.moreAfter} />}
           refreshControl={refreshControl}
           stickyHeaderIndices={[0]}
           stickyHeaderHiddenOnScroll={true}
           onEndReached={timeline.moreAfter}
           onEndReachedThreshold={0.7}
        />
        <View style={{position: 'absolute', bottom: 50, right: 50}}><Pressable onPress={() => setPostModalVisible(true)}><AntDesign name="pluscircle" size={48} color="green" /></Pressable></View>
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
