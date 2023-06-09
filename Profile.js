import { SafeAreaView } from 'react-native-safe-area-context';
import { Image, StyleSheet, Text, ScrollView, View } from 'react-native';
import MFM from './MFM';
import React, {useState,useEffect, useContext} from 'react';
import { PostList } from './Posts';
import { AccountContext} from './Account';
import { formatUsername } from './utils';

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
function Profile(props) {
  const [posts, setPosts] = useState([]);
  const myAccount = useContext(AccountContext);
  const account = props.account;

  const loadMore = (since, until) => {
      if (!account || !myAccount.instance) {
          return;
      }
      const url = 'https://' + myAccount.instance + "/api/users/notes";
      const params = {
        i: myAccount.i,
        userId: account.id,
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
            return resp.json()
        }
      ).then( (json) => {
          setPosts([...posts, ...json]);
      }).catch( (e) => {
          console.error(e)
      });
  }
    useEffect( () => {
        if (!account) {
            return;
        }
        loadMore(null, null);
    }, [props.account]);
    return (
        <ScrollView style={styles.mainContainer}
            stickyHeaderIndices={[1]}
            stickyHeaderHiddenOnScroll={false}>
          <View>
            <View>
              <Image source={{uri: account.bannerUrl}} style={{width: "100%", height: 200}} />
            </View>
            <View>
              <Image source={{uri: account.avatarUrl}} style={{width: 120, height: 120, top: -100, left: 20, borderColor: 'black', borderRadius: 25, borderWidth: 1}} />
            </View>
          </View>
          <View style={{top: -75}}>
            <View style={styles.nameContainer}>
              <Text style={styles.realname}>{account.name}</Text>
              <Text style={styles.username}>{formatUsername(account)}</Text>
            </View>
          </View>
          <View style={{top: -75}}>
            <OnlineStatus hideOnlineStatus={account.hideOnlineStatus} onlineStatus={account.onlineStatus} />
            <Location location={account.location} />
            <Birthday birthday={account.birthday} />
            <JoinedDate date={account.createdAt} />
            <View style={styles.description}>
              <MFM text={account.description} loadProfile={props.onProfileClick}/>
            </View>
            <View style={styles.counts}>
              <Count name="Notes" value={account.notesCount} />
              <Count name="Following" value={account.followingCount} />
              <Count name="Follower" value={account.followersCount} />
            </View>
            <PostList 
                style={styles.flexer}
                posts={posts}
                withBoosts={true}
                onProfileClick={props.onProfileClick}
                loadMore={() => {
                  if (posts.length > 0) {
                      loadMore(null, posts[posts.length-1].id);
                  }
                }}
            />
          </View>
        </ScrollView>
    );
    // FIXME: Pinned notes
    // FIXME: With/without boosts
    // FIXME: Follow button?
    // FIXME: those extra fields that mastodon uses
}
export function MyProfile({navigation}) {
    const account = useContext(AccountContext);
    return <Profile account={account.accountInfo}
               onProfileClick={(profileId) => {
                   navigation.navigate('Home', {
                      screen: 'Profile',
                      params: { ProfileId: profileId }
                   });
               }}
 
        />
}
export function OtherProfile({navigation, route}) {
    const [account, setAccount] = useState(null);
    const myAccount = useContext(AccountContext);
    useEffect( () => {
      if (!route.params.ProfileId) {
          return;
      }
      const url = 'https://' + myAccount.instance + "/api/users/show";
      const params = {
        i: myAccount.i,
        userId: route.params.ProfileId,
      }
      fetch(url,
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
          setAccount(json);
      }).catch( (e) => {
          console.error('error loading ', url);
          console.error(e)
      });
    }, [route.params]);
    if (!account) {
        return <View />;
    }

    return <Profile account={account}
               onProfileClick={(profileId) => {
                   navigation.push('Profile', {
                      ProfileId: profileId
                   });
               }}
     />;
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
