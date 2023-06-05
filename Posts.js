import MFM from './MFM';
import { FlatList, StyleSheet, Pressable, Text, TextInput, View, Image, Button, Alert, Modal } from 'react-native';
import { useRef, useContext, useCallback, useState } from 'react';
import { LinkPreview } from '@flyerhq/react-native-link-preview';
import 'date-time-format-timezone';
import { formatUsername } from './utils';
import { useNavigation } from '@react-navigation/native';
import { Entypo } from "@expo/vector-icons";
import { MenuOptions, MenuOption, Menu, MenuTrigger} from 'react-native-popup-menu';
import * as Linking from 'expo-linking';
import { AccountContext} from './Account';
import { ServerContext} from './contexts';
import { useAPI } from './api';
import { Video, ResizeMode } from 'expo-av';


function Poll({choices, noteid}) {
    const api = useAPI();
    const choicesViews = choices.map( (option, i) => {
        // console.log(option);
        const textStyle = option.isVoted ? { fontWeight: 'bold'} : {};
        return (
          <View style={{borderWidth: 1, padding: 5, margin: 2}}
            key={option.text}>
            <Pressable onPress={() => {
                console.log(i, noteid);
                api.call("notes/polls/vote", {noteId: noteid, choice: i}).then(
                    () => {
                        Alert.alert("Voted", "Voted for " + option.text);
                    }
                ).catch( (e) => {
                    console.error(e);
                    Alert.alert('Could not vote', '' + e);
                });
            }}>
              <Text style={textStyle}>{option.text} (Votes: {option.votes})</Text>
            </Pressable>
          </View>
        );
    });
    return <View style={{
        flexDirection: 'column',
        margin: 10,
    }}>{choicesViews}</View>;
}

// import RelativeTime from '@yaireo/relative-time'

export function PostModal({show, onClose, replyTo, replyContext}) {
    const author = useContext(AccountContext);
    const server = useContext(ServerContext);
    const [content, setContent] = useState('');
    const api = useAPI();
    const postAuthor = (author && author.accountInfo) ?
            <View style={{flex: 3, height: 50}}>
                <PostAuthor user={author.accountInfo}
                          onProfileClick={() => {}} 
                 />
            </View> : <View />;
             //console.log(server);
    
    return <Modal animationType="slide" style={{flex: 1}}
                visible={show}
                onRequestClose={() => onClose()}>
        <View style={{flex: 1}}>
            <View style={{flex: 1, flexDirection: 'row'}}>
              {postAuthor}
              <View style={{flex: 1, alignItems: 'center'}}><Text style={{flex: 1, textAlign: 'right'}}>Characters left: {server ? server.maxNoteTextLength - content.length: 'unknown'}</Text></View>
            </View>
            {replyContext}
            <MFM style={{flex: 2}} text={content} />
            <TextInput multiline={true} 
                style={{flex: 6, padding: 2, margin: 2, borderColor: 'black', borderWidth: 2, textAlignVertical: 'top'}}
                autoFocus={true}
                value={content}
                onChangeText={setContent}
                placeholder="Say something"/>

            <View style={{flex: 1, flexDirection: 'row', alignContent: 'stretch', borderWidth: 3}}>
            <View style={{flex: 1, padding: 3}}><Button title="Post" onPress={() => {
                if (content == '') {
                    Alert.alert('No content', 'Did you want to cancel instead of posting?');
                    return;
                }
                const params = {
                    text: content,
                    poll: null,
                    localOnly: false,
                    visibility: "public"
                };
                if (replyTo) {
                    params['replyId']= replyTo;
                }

                api.call("notes/create", params).then(
                    () => {
                        //console.log(json);
                        // reset the content for future replies
                        setContent('');
                        onClose();
                    }
                ).catch( (e) => {
                    console.error(e);
                    Alert.alert('Could not post');
                    onClose();
                });
              }}/></View>
              <View style={{flex: 1, padding: 3}}><Button style={{flex: 1}} title="Cancel" onPress={() => {
                  onClose();
              }} /></View>
              </View>
        </View>
    </Modal>;
}
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

export function PostContext(props) {
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
        emojis={props.context.emojis}
        reactionEmojis={props.context.reactionEmojis}
      />
    </View>
  );
}

function PostMenu(props) {
    const account = useContext(AccountContext);
    const server = useContext(ServerContext);
    const api = useAPI();
    const options = [];
    if (account && props.PostId) {
        options.push(<MenuOption key="open" onSelect={() => Linking.openURL('https://' + account.instance + '/notes/' + props.PostId)} text="Open in browser" />);
    }
    if (props.OriginalURL) {
        options.push(<MenuOption key="openorig" onSelect={() => {
                Linking.openURL(props.OriginalURL)
            }} text="Open original in browser" />);
    }
    if (account && props.PostId) {
      options.push(<View key="divider" style={{
               borderBottomColor: 'black',
               borderBottomWidth: StyleSheet.hairlineWidth,
             }} />);
      options.push(<MenuOption key="boost" onSelect={() => {
          //console.log('api', api);
        api.call("notes/create", {
          renoteId: props.PostId,
          visibility: 'public',
        }).then ( (json) => {
            // console.log(json);
            Alert.alert('Boosted post');
        });
      }} text="Boost" />);
      if (props.doReply) {
        options.push(<MenuOption key="reply" onSelect={() => {
            props.doReply(props.PostId);
        }} text="Reply" />);
      };
      options.push(<MenuOption key="like" onSelect={() => {
        // console.log(server);
        // Alert.alert('should make API call to notes/reactions/create {noteId: props.PostId, reaction: props.DefaultReaction}');
        api.call("notes/reactions/create", {
          noteId: props.PostId,
          reaction: server.defaultReaction || '⭐'
        }).then ( (json) => {
            //console.log(json);
            Alert.alert('Liked post');
        }).catch( (e) => console.warn(e));
      }} text="Like" />);
    }

    return (
        <Menu style={{flex: 1}}>
          <MenuTrigger style={{flex: 1, alignSelf: 'flex-end'}}>
            <Entypo name="dots-three-vertical" size={24} color="black" />
          </MenuTrigger>
          <MenuOptions>
            {options}

          </MenuOptions>

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
          <PostMenu doReply={props.doReply} PostId={props.content.id} OriginalURL={props.content.url || props.content.uri} myAccount={props.myAccount}/>
        </View>
        <Text style={styles.postTime}>{timestr}</Text>
      </View>
    );
}
export function Post(props) {
    const navigation = useNavigation();
    const api = useAPI();
    const loadThread = useCallback( () => {
      if (navigation && navigation.push) {
        console.log("Pushing thread", props.noteid);
        navigation.push("Thread", { PostId: props.noteid});
      }
    }, [props.noteid]);
    // FIXME: Come up with a more robust regex
    const urlRE = /https?:\/\/[\w./\-?+]+/g;
    const thetext = props.text || ''
    const [hashtagModal, setHashtagModal] = useState(null);
    const onHashtag = (hashtag) => {
        navigation.push("Hashtag", { Tag: hashtag });
    };
    const urls = [...thetext.matchAll(urlRE)];
    const previews = urls.map( (val, i) => {
        return <LinkPreview key={i} text={val[0]} 
            renderText={() => <View />}
        />;
    });

    const images = props.content.files ? (
      <View>
      {props.content.files.map((file, i) => {

        if (file.type.startsWith('video/')) {
            // console.log('file', file, status);
            return <Video
                key={i}
                style={{flex: 1, height: 400}}
                source={{uri: file.url}}
                useNativeControls
                shouldPlay={true}
                resizeMode={ResizeMode.CONTAIN}
                isLooping
            />;
            return <View key={i}><Text>Unhandled vodeo type {file.type}</Text></View>;
        } else if (file.type.startsWith('image/')) {
            const height = file.properties.height > 400 ? 400 : file.properties.height;
            return <Image key={i}
                 source={{ uri: file.url}}
                 height={height}
                 resizeMode={'contain'}
                 resizeMethod={'resize'}
           />;
        } else {
            return <View key={i}><Text>Unhandled attachment type {file.type}</Text></View>;
        }
      })}
      </View>) : <View />;
    const reactions = props.content.reactions && Object.keys(props.content.reactions).length > 0 ? (
       <View style={{marginTop: 15, paddingTop: 5, borderStyle: 'dotted', borderTopColor: 'green', borderTopWidth: 2, flexDirection: 'row', flexWrap: 'wrap'}}>
         {Object.keys(props.content.reactions).map((val) => {
           if (val.startsWith(':') && val.endsWith(':')) {
               const emojiname = val.substr(1, val.length-2);
               console.log(emojiname, props.reactionEmojis);

                /*
                 <Image style={{width: 40, height: 40}}
                   source={{ uri: props.user.avatarUrl}}
                 />
                 */
               let reactionImage = <Text style={{fontSize: 24}}>{val}</Text>;
               for (const emoji of (props.reactionEmojis || [])) {
                   if (emoji.name == emojiname) {
                       reactionImage = <Image style={{width: 24, height: 24}} source={{ uri: emoji.url}} />
                       break;
                   }
               }
               return (
                 <View key={val} style={{flexDirection: 'row', flexWrap: 'nowrap', paddingRight: 20, alignItems: 'center'}}>
                   {reactionImage}
                   <Text style={{fontSize: 24}}>{props.content.reactions[val]}</Text>
                 </View>
               );

           }
           return <View key={val} style={{flexDirection: 'row', flexWrap: 'nowrap', paddingRight: 20}}>
                        <Text style={{fontSize: 24}}>{val}</Text>
                        <Text style={{fontSize: 24}}>{props.content.reactions[val]}</Text>
                  </View>;
         })}
       </View>
       ) : <View />;
    const text = props.text ? <MFM onClick={loadThread} onHashtagClicked={onHashtag} text={props.text} emojis={props.emojis} loadProfile={props.onProfileClick}/> : '';
    const poll = props.content.poll ? <Poll choices={props.content.poll.choices} expiresAt={props.content.poll.expiresAt} multiple={props.content.poll.multiple} noteid={props.noteid} /> : null;
    if (props.reply) {
        return (
          <View style={props.noBorder ? styles.postContainerNoBorder : styles.postContainer}>
            <Text>{props.replyLabel || 'In reply to:'}</Text>
            <PostContext context={props.reply} onProfileClick={props.onProfileClick} />
            <Pressable onPress={loadThread}>
                <PostHeader author={props.author}
                    visibility={props.visibility}
                    time={props.time}
                    doReply={props.doReply}
                    onProfileClick={props.onProfileClick}
                    content={props.content}
                />
            </Pressable>
                {text}
                {images}
                {previews}
                {reactions}
          </View>
       );
    } else {
        return (
          <View style={props.noBorder ? styles.postContainerNoBorder : styles.postContainer}>
          {hashtagModal}
         <Pressable onPress={loadThread}>
            <PostHeader author={props.author}
                visibility={props.visibility}
                onProfileClick={props.onProfileClick}
                content={props.content}
                doReply={props.doReply}
                time={props.time}
                myAccount={props.myAccount}
            />
         </Pressable>
            {text}
            {poll}
            {images}
            {previews}
            {reactions}
          </View>
       );
    }
}

export function UserList(props) {

    return <FlatList
           data={props.users}
           renderItem={({item}) => <PostAuthor user={item} onProfileClick={props.onProfileClick} />}
           ListHeaderComponent={<View><Text>Users of {props.tag}</Text></View>}
           ListFooterComponent={<View><Button title="Load more" onPress={props.loadMore} /></View>}
           />
}
export function PostList(props) {
    const posts = props.withBoosts ? props.posts : props.posts.filter((p) => {
        return p.text !== null;
    });
    return (
      <View style={styles.flexer}>
      {posts.map((p, i) => {
          // FIXME: Move this logic into <Post />?
        //console.log(p);
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
                        doReply={props.doReply}
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
                doReply={props.doReply}
                onProfileClick={props.onProfileClick} 
                myAccount={props.myAccount}
            />;
        } else if (!p.text && p.renote) {
            // boost
            return (
              <View key={i}
                  style={props.noBorder ? styles.postContainerNoBorder : styles.postContainer}>
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
                    doReply={props.doReply}
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
                    doReply={props.doReply}
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
    // console.log(p);
    if (p.text && p.renote) {
        // QT
        return <Post
                        uri={p.uri}
                        noteid={p.id}
                        text={p.text} 
                        time={p.createdAt}
                        content={p}
                        doReply={props.doReply}
                        author={p.user}
                        visibility={p.visibility}
                        reply={p.renote}
                        replyLabel={'RE:'}
                        emojis={p.emojis}
                        reactionEmojis={p.reactionEmojis}
                        onProfileClick={props.onProfileClick} 
                        noBorder={props.noBorder}
                    />;
        } else if (p.text && !p.renote) {
            // Plain post
            //console.log(p.emojis);
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
                reactionEmojis={p.reactionEmojis}
                doReply={props.doReply}
                onProfileClick={props.onProfileClick} 
                noBorder={props.noBorder}
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
                    doReply={props.doReply}
                    author={p.renote.user}
                    content={p.renote}
                    visibility={p.renote.visibility}
                    emojis={p.emojis}
                    reactionEmojis={p.renote.reactionEmojis}
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
                    doReply={props.doReply}
                    emojis={p.emojis}
                    reactionEmojis={p.reactionEmojis}
                    onProfileClick={props.onProfileClick} 
                    myAccount={props.myAccount}
                    noBorder={props.noBorder}
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
  postContainerNoBorder: {
    flex: 1,
    color: '#000',
    backgroundColor: '#eee',
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
