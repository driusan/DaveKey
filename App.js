// import 'react-native-gesture-handler';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import  GetAccessToken from './AccessToken';
import { RefreshControl, Pressable, StyleSheet, Text, ScrollView, View } from 'react-native';
import React, {useState,useEffect, useCallback, useContext} from 'react';
import { PostList } from './Posts';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { AccountContext, useCalckeyAccount} from './Account';
import { MyProfile, OtherProfile } from './Profile';
import {Thread} from './Thread';


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

function MainArea(props) {
  const [includeBoosts, setIncludeBoosts] = useState(true);
  if (props.timeline.posts) {
    return (
      <View>
        <BoostSelect withBoosts={includeBoosts} setWithBoosts={setIncludeBoosts} />
        <PostList style={styles.flexer} posts={props.timeline.posts} withBoosts={includeBoosts}
            loadMore={props.timeline.moreAfter}
            onProfileClick={props.onProfileClick}
            />
      </View>
    );
  }
  return <Text>Loading {props.instance}..</Text>;
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

    return (
      <AccountContext.Provider value={account}>
        <NavigationContainer>
          <ActionsDrawer account={account}/>
        </NavigationContainer>
      </AccountContext.Provider>
    );
}

function Timeline({navigation}) {
  const [timelineType, setTimelineType] = useState('hybrid');
  const account = useContext(AccountContext);
  const timeline = useTimeline(account, timelineType);

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
      <ScrollView style={styles.mainContainer}
                  refreshControl={refreshControl}
                  stickyHeaderIndices={[0]}
                  stickyHeaderHiddenOnScroll={true}
                   >
         <TimelineSelect
            onChange={setTimelineType}
            active={timelineType}
         />
   
        <MainArea style={styles.flexer}
                  timeline={timeline}
                  onProfileClick={profileNavigate}
        />
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
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
