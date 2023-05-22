import MFM from './MFM';
import { StyleSheet, Pressable, Text, View, Image, Button } from 'react-native';
import { useContext } from 'react';
import { LinkPreview } from '@flyerhq/react-native-link-preview';
import 'date-time-format-timezone';
import { formatUsername } from './utils';
import { useNavigation } from '@react-navigation/native';
import { Entypo } from "@expo/vector-icons";
import { MenuProvider, MenuOptions, MenuOption, Menu, MenuTrigger} from 'react-native-popup-menu';
import * as Linking from 'expo-linking';
import { AccountContext} from './Account';


// import RelativeTime from '@yaireo/relative-time'

function PostVisibility(props) {
    switch (props.visibility) {
        case 'public':
            return <Text>🌐</Text>;
        case 'home':
            return <Text>🏠</Text>;
        case 'specified':
            return <Text>✉️</Text>;
        case 'followers':
            return <Text>🤝</Text>;
        default:
        throw new Error('Unhandled visibility: ' + props.visibility);
    }
}
export function PostAuthor(props) {
    return (
           <Pressable onPress={() => {
               if (props.onProfileClick) {
                   props.onProfileClick(props.user.id);
               } else {
                   console.error('No onProfileClick defined');
               }
           }}>
         <View style={{flexDirection: 'row', padding: 5, flex: 1}}>
               <View style={{paddingRight: 5}}>
                 <Image style={{width: 40, height: 40}}
                   source={{ uri: props.user.avatarUrl}}
                 />
               </View>
               <View>
                 <Text>{props.user.name}</Text>
                 <Text>{formatUsername(props.user)}</Text>
               </View>
         </View>
           </Pressable>
    );
}

function PostContext(props) {
  if (!props.context) {
    return <View />;
  }

  return (
    <View style={{flex: 1}}>
      <Post uri={props.context.uri}
        text={props.context.text} 
        time={props.context.createdAt}
        author={props.context.user}
        content={props.context}
        noteid={props.context.id}
        onProfileClick={props.onProfileClick}
        visibility={props.context.visibility}
      />
    </View>
  );
}

function PostMenu(props) {
    const account = useContext(AccountContext);
    const options = [];
    if (account && props.PostId) {
        options.push(<MenuOption key="open" onSelect={() => Linking.openURL('https://' + account.instance + '/notes/' + props.PostId)} text="Open in browser" />);
    }
    if (props.OriginalURL) {
        options.push(<MenuOption key="openorig" onSelect={() => {
                Linking.openURL(props.OriginalURL)
            }} text="Open original in browser" />);
    }
    return (
        <Menu style={{flex: 1}}>
          <MenuTrigger style={{flex: 1, alignSelf: 'flex-end'}}>
            <Entypo name="dots-three-vertical" size={24} color="black" />
          </MenuTrigger>
          <MenuOptions>{options}</MenuOptions>
        </Menu>
      );
}
function PostHeader(props) {
    const locale = 'en-CA';
    const time= new Date(props.time);
    // const relativeTime = new RelativeTime();

    const timestr = time.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ' at ' + time.toLocaleTimeString(locale);
	// Intl doesn't seem to be supported in React native
    // const timestr = relativeTime.from(time);

    return (
      <View style={styles.postMetaContainer}>
        <View style={{flexDirection: 'row'}}>
          <PostAuthor user={props.author}
                      onProfileClick={props.onProfileClick} 
           />
          <PostVisibility visibility={props.visibility} />
          <PostMenu PostId={props.content.id} OriginalURL={props.content.url || props.content.uri} myAccount={props.myAccount}/>
        </View>
        <Text style={styles.postTime}>{timestr}</Text>
      </View>
    );
}
export function Post(props) {
    const navigation = useNavigation();
    // FIXME: Come up with a more robust regex
    const urlRE = /https?:\/\/[\w./\-?+]+/g;
    const thetext = props.text || ''
    const urls = [...thetext.matchAll(urlRE)];
    const previews = urls.map( (val, i) => {
        return <LinkPreview key={i} text={val[0]} 
            renderText={() => <View />}
        />;
    });

    const images = props.content.files ? (
      <View>
      {props.content.files.map((file, i) => {
        const height = file.properties.height > 400 ? 400 : file.properties.height;
        return <Image key={i}
                 source={{ uri: file.url}}
                 height={height}
                 resizeMode={'contain'}
                 resizeMethod={'resize'}
               />;
        })}
      </View> ): <View />;
    const reactions = props.content.reactions && Object.keys(props.content.reactions).length > 0 ? (
       <View style={{marginTop: 15, paddingTop: 5, borderStyle: 'dotted', borderTopColor: 'green', borderTopWidth: 2, flexDirection: 'row', flexWrap: 'wrap'}}>
         {Object.keys(props.content.reactions).map((val) => {
           // FIXME: Handle custom emojis
           return <View key={val} style={{flexDirection: 'row', flexWrap: 'nowrap', paddingRight: 20}}>
                        <Text style={{fontSize: 24}}>{val}</Text>
                        <Text style={{fontSize: 24}}>{props.content.reactions[val]}</Text>
                  </View>;
         })}
       </View>
       ) : <View />;
    const text = props.text ? <MFM text={props.text} emojis={props.emojis} loadProfile={props.onProfileClick}/> : '';
    const loadThread = () => {
        if (navigation && navigation.push) {
            navigation.push("Thread", { PostId: props.noteid});
        }
    }
    if (props.reply) {
        return (
          <View style={styles.postContainer}>
            <Text>{props.replyLabel || 'In reply to:'}</Text>
            <PostContext context={props.reply} onProfileClick={props.onProfileClick} />
            <Pressable onPress={loadThread}>
                <PostHeader author={props.author}
                    visibility={props.visibility}
                    time={props.time}
                    onProfileClick={props.onProfileClick}
                    content={props.content}
                />
                {text}
                {images}
                {previews}
                {reactions}
            </Pressable>
          </View>
       );
    } else {
        return (
         <Pressable onPress={loadThread}>
          <View style={styles.postContainer}>
            <PostHeader author={props.author}
                visibility={props.visibility}
                onProfileClick={props.onProfileClick}
                content={props.content}
                time={props.time}
                myAccount={props.myAccount}
            />
            {text}
            {images}
            {previews}
            {reactions}
          </View>
         </Pressable>
       );
    }
}

export function PostList(props) {
    const posts = props.withBoosts ? props.posts : props.posts.filter((p) => {
        return p.text !== null;
    });
    return (
      <View style={styles.flexer}>
      {posts.map((p, i) => {
          // FIXME: Move this logic into <Post />?
        if (p.text && p.renote) {
            // QT
            return <Post key={i}
                        uri={p.uri}
                        noteid={p.id}
                        text={p.text} 
                        time={p.createdAt}
                        content={p}
                        author={p.user}
                        visibility={p.visibility}
                        reply={p.renote}
                        replyLabel={'RE:'}
                        emojis={p.emojis}
                        onProfileClick={props.onProfileClick} 
                        myAccount={props.myAccount}
                    />;
        } else if (p.text && !p.renote) {
            // Plain post
            return <Post 
                key={i}
                uri={p.uri}
                noteid={p.id}
                text={p.text} 
                time={p.createdAt}
                content={p}
                author={p.user}
                visibility={p.visibility}
                reply={p.reply}
                emojis={p.emojis}
                onProfileClick={props.onProfileClick} 
                myAccount={props.myAccount}
            />;
        } else if (!p.text && p.renote) {
            // boost
            return (
              <View key={i}
                    style={styles.postContainer}>
                <View style={{
                      flex: 1,
                      flexDirection: 'row',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      textAlign: 'center',
                }}>
                  <Text>Boosted by </Text>
                  <PostAuthor user={p.user} onProfileClick={props.onProfileClick}/>
                  <PostVisibility visibility={p.visibility} />
                </View>
                <Post 
                    key={i}
                    uri={p.uri}
                    text={p.renote.text} 
                    noteid={p.renote.id}
                    time={p.createdAt}
                    author={p.renote.user}
                    content={p.renote}
                    visibility={p.renote.visibility}
                    emojis={p.emojis}
                    onProfileClick={props.onProfileClick} 
                    myAccount={props.myAccount}
                />
              </View>
           );
        } else { // !text !renote.. nothing?
            if (p.files) {
                // no text, but had file or image attached. Treat it as a post
                return <Post key={i}
                    uri={p.uri}
                    text={p.text} 
                    time={p.createdAt}
                    noteid={p.id}
                    content={p}
                    author={p.user}
                    visibility={p.visibility}
                    reply={p.reply}
                    emojis={p.emojis}
                    onProfileClick={props.onProfileClick} 
                    myAccount={props.myAccount}
                />;
            }
            console.warn(p);
            throw new Error('Unhandled post. No text and no renote.');
        }
      })}
      <Button title="Load more" onPress={props.loadMore} />
      </View>
    );
}

export function FlatListPost(props) {
    const p = props.post;
    if (p.text && p.renote) {
        // QT
        return <Post
                        uri={p.uri}
                        noteid={p.id}
                        text={p.text} 
                        time={p.createdAt}
                        content={p}
                        author={p.user}
                        visibility={p.visibility}
                        reply={p.renote}
                        replyLabel={'RE:'}
                        emojis={p.emojis}
                        onProfileClick={props.onProfileClick} 
                    />;
        } else if (p.text && !p.renote) {
            // Plain post
            return <Post 
                uri={p.uri}
                noteid={p.id}
                text={p.text} 
                time={p.createdAt}
                content={p}
                author={p.user}
                visibility={p.visibility}
                reply={p.reply}
                emojis={p.emojis}
                onProfileClick={props.onProfileClick} 
            />;
        } else if (!p.text && p.renote) {
            // boost
            return (
              <View style={styles.postContainer}>
                <View style={{
                      flex: 1,
                      flexDirection: 'row',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      textAlign: 'center',
                }}>
                  <Text>Boosted by </Text>
                  <PostAuthor user={p.user} onProfileClick={props.onProfileClick}/>
                  <PostVisibility visibility={p.visibility} />
                </View>
                <Post uri={p.uri}
                    text={p.renote.text} 
                    noteid={p.renote.id}
                    time={p.createdAt}
                    author={p.renote.user}
                    content={p.renote}
                    visibility={p.renote.visibility}
                    emojis={p.emojis}
                    onProfileClick={props.onProfileClick} 
                    myAccount={props.myAccount}
                />
              </View>
           );
        } else { // !text !renote.. nothing?
            if (p.files) {
                // no text, but had file or image attached. Treat it as a post
                return <Post uri={p.uri}
                    text={p.text} 
                    time={p.createdAt}
                    noteid={p.id}
                    content={p}
                    author={p.user}
                    visibility={p.visibility}
                    reply={p.reply}
                    emojis={p.emojis}
                    onProfileClick={props.onProfileClick} 
                    myAccount={props.myAccount}
                />;
            }
            console.warn(p);
            throw new Error('Unhandled post. No text and no renote.');
        }
}

const styles = StyleSheet.create({
  postContainer: {
    flex: 1,
    color: '#000',
    backgroundColor: '#eee',
    borderColor: 'black',
    borderStyle: 'solid',
    borderWidth: 1,
    padding: 10,
  },
  postMetaContainer: {
    flex: 1,
    color: '#000',
    backgroundColor: '#eee',
    padding: 10,
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  postTime: {
      flex: 1,
  },
  postAuthor: {
      flex: 4,
  },
  flexer: {
      flex: 1,
  },
});
// export default { PostList, Post };
