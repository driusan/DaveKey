// import 'react-native-gesture-handler';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import  GetAccessToken from './AccessToken';
import { Image, Button, DrawerLayoutAndroid, RefreshControl, Pressable, StyleSheet, Text, ScrollView, View } from 'react-native';
import MFM from './MFM';
import React, {useState,useEffect, useCallback, useContext, createContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostList } from './Posts';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { AccountContext} from './Account';

function KeyValue(props) {
    return (
      <View style={styles.keyValueContainer}>
        <Text style={styles.keyDisplay}>{props.keyName}:</Text>
        <Text style={styles.valueDisplay}>{props.value}</Text>
      </View>
    );
}
function OnlineStatus(props) {
    if (props.hideOnlineStatus) {
        return <View />;
    }
    return <KeyValue keyName="Online Status" value={props.onlineStatus} />;
}
function Birthday(props) {
    if (!props.birthday) {
        return <View />;
    }

    const time= new Date(props.birthday);

    const timestr = time.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
    return <KeyValue keyName="Birthday" value={timestr} />
}

function JoinedDate(props) {
    const time= new Date(props.date);

    const timestr = time.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
    return <KeyValue keyName="Joined" value={timestr} />
}
function Location(props) {
    if (!props.location) {
        return <View />;
    }
    return <KeyValue keyName="Location" value={props.location} />
}

function Count(props) {
    if (!props.value || !props.name) {
        return <View />;
    }
    return <View style={styles.countContainer}><Text style={styles.countText}>{props.name}</Text><Text style={styles.countText}>{props.value}</Text></View>;
}
export function MyProfile({navigation, route}) {
    const account = useContext(AccountContext);
    const [posts, setPosts] = useState([]);

  const loadMore = (since, until) => {
      if (!account || !account.instance) {
          return;
      }
      const url = 'https://' + account.instance + "/api/users/notes";
      const params = {
        i: account.i,
        userId: account.accountInfo.id,
      }

      if (until) {
          params['untilId'] = until;
      }
      if (since) {
          params['sinceId'] = since;
      }
      console.log(account.accountInfo, params);
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
            return resp.json()
        }
      ).then( (json) => {
          setPosts([...posts, ...json]);
          console.log('done loading ', url, json);
      }).catch( (e) => {
          console.error('error loading ', url);
          console.error(e)
      });
  }
    useEffect( () => {
        if (!account) {
            return;
        }
        loadMore(null, null);
    }, [account]);
    return (
      <SafeAreaView style={{flex: 1}}>
        <ScrollView style={styles.mainContainer}
            stickyHeaderIndices={[1]}
            stickyHeaderHiddenOnScroll={false}>
          <View>
            <View>
              <Image source={{uri: account.accountInfo.bannerUrl}} style={{width: "100%", height: 200}} />
            </View>
            <View>
              <Image source={{uri: account.accountInfo.avatarUrl}} style={{width: 120, height: 120, top: -100, left: 20, borderColor: 'black', borderRadius: 25, borderWidth: 1}} />
            </View>
          </View>
          <View style={{top: -75}}>
            <View style={styles.nameContainer}>
              <Text style={styles.realname}>{account.accountInfo.name}</Text>
              <Text style={styles.username}>{account.mentionName()}</Text>
            </View>
          </View>
          <View style={{top: -75}}>
            <OnlineStatus hideOnlineStatus={account.accountInfo.hideOnlineStatus} onlineStatus={account.accountInfo.onlineStatus} />
            <Location location={account.accountInfo.location} />
            <Birthday birthday={account.accountInfo.birthday} />
            <JoinedDate date={account.accountInfo.createdAt} />
            <View style={styles.description}>
              <MFM text={account.accountInfo.description} />
            </View>
            <View style={styles.counts}>
              <Count name="Notes" value={account.accountInfo.notesCount} />
              <Count name="Following" value={account.accountInfo.followingCount} />
              <Count name="Follower" value={account.accountInfo.followersCount} />
            </View>
            <PostList 
                style={styles.flexer}
                posts={posts}
                withBoosts={true}
                loadMore={() => {
                  if (posts.length > 0) {
                      loadMore(null, posts[posts.length-1].id);
                  }
                }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
    // FIXME: Pinned notes
    // FIXME: With/without boosts
    // FIXME: Follow button?
    // FIXME: those extra fields that mastodon uses
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
    flexFlow: 'space-between',
    flexDirection: 'column',
    width: '100%',
  },
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignContent: 'center',
    backgroundColor: '#fff',
  },
  realname: {
    flex: 1,
    fontSize: 24,
    padding: 5,
    backgroundColor: '#fff',
    fontWeight: 'bold',
    textAlign: 'left',
  },
  username: {
    flex: 1,
    padding: 10,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  keyValueContainer: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'flex-start',
      paddingLeft: 15,
  },
  keyDisplay: {
      fontWeight: 'bold',
      width: 100,
  },
  valueDisplay: {
  },
  description: {
      paddingLeft: 5,
      paddingRight: 5,
      paddingTop: 10,
      paddingBottom: 10,
  },
  counts: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: '#eee',
      borderStyle: 'solid',
      borderWidth: 1,
  },
  countContainer: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      borderStyle: 'solid',
      borderWidth: 1,
      padding: 5,
  },
  countText: {
      flex: 1,
      textAlign: 'center',
  }
});
