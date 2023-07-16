import MFM from './MFM';
import { Animated, Dimensions, FlatList, StyleSheet, Pressable, Text, TextInput, ScrollView, View, Image, Button, Alert, Modal, PanResponder, RefreshControl } from 'react-native';
import { useRef, useContext, useCallback, useState, useEffect } from 'react';
import { LinkPreview } from '@flyerhq/react-native-link-preview';
import 'date-time-format-timezone';
import { formatUsername } from './utils';
import { useNavigation, useTheme } from '@react-navigation/native';
import { Entypo } from "@expo/vector-icons";
import { MenuOptions, MenuOption, Menu, MenuTrigger} from 'react-native-popup-menu';
import * as Linking from 'expo-linking';
import { AccountContext} from './Account';
import { ServerContext} from './contexts';
import { useAPI, useAPIPaginator } from './api';
import { Video, ResizeMode } from 'expo-av';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'; 
import ImageViewer from 'react-native-image-zoom-viewer';

function PostImage({url, imageHeight, imageWidth, postImages}) {
    const [displayModal, setDisplayModal] = useState(false);
    const modal = () => {
        if (displayModal == false) {
            return null;
        }
        const dims = Dimensions.get('window');
        const height = imageHeight > dims.height ? dims.height : imageHeight;
        return <Modal animationType="fade" transparent={true}>
            <View style={{backgroundColor: 'rgba(0, 0, 0, 0.8)', height: dims.height, width: dims.width}}>
               <ImageViewer 
                onCancel={() => setDisplayModal(false)}
                imageUrls={postImages}
                saveToLocalByLongPress={false}
                enableSwipeDown={true}
                useNativeDriver={true}
                />
            </View>
    </Modal>; 
    };

/*
                   <Animated.View
                       style={
                        {transform: [
                            {translateX: changeX},
                            {translateY: changeY}
                         ]
                        }
                       }
                       {...panResponder.panHandlers}>
                   <Image
                           height={height}
                           source={{ uri: url}}
                           resizeMode={'contain'}
                           resizeMethod={'auto'} 
                    />
                    </Animated.View>
                    */
    return (<View>
        {modal()}
        <Pressable onPress={() => { setDisplayModal(true) }}>
            <Image 
               source={{ uri: url}}
               height={imageHeight > 400 ? 400 : imageHeight}
               resizeMode={'contain'}
               resizeMethod={'resize'}
            />
         </Pressable>
     </View>);
}
function Poll({choices, noteid}) {
    const api = useAPI();
    const theme = useTheme().colors;
    const choicesViews = choices.map( (option, i) => {
        // console.log(option);
        const textStyle = option.isVoted ? { fontWeight: 'bold', color: theme.primary} : {color: theme.text};
        return (
          <View style={{borderWidth: 1, padding: 5, margin: 2, borderColor: theme.border, backgroundColor: theme.background}}
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

function CWIcon({enabled, onPress}) {
    const theme = useTheme().colors;
    const color = enabled ? theme.primary : theme.text
    return (
      <View style={{flex: 1, justifyContent: 'flex-end', alignItems: 'center'}}>
        <Pressable onPress={ () => {
            if (onPress) {
                onPress(!enabled);
            }
        }}>
            <MaterialIcons name="warning" size={24} color={color} />
        </Pressable>
      </View>
    );
}
function PollIcon({enabled, onPress}) {
    const theme = useTheme().colors;
    const color = enabled ? theme.primary : theme.text
    return (
      <View style={{flex: 1, justifyContent: 'flex-end', alignItems: 'center'}}>
        <Pressable onPress={ () => {
            if (onPress) {
                onPress(!enabled);
            }
        }}>
            <MaterialCommunityIcons name="poll" size={24} color={color} />
        </Pressable>
      </View>
    );
}
function AttachIcon() {
    const theme = useTheme().colors;
    const [enabled, setEnabled] = useState(false);
    // FIXME: Colour should be based on if attachments exist
    const color = enabled ? theme.primary : theme.text
    return (
      <View style={{flex: 1, justifyContent: 'flex-end', alignItems: 'center'}}>
        <Pressable onPress={ () => setEnabled(!enabled)}>
            <Entypo name="attachment" size={24} color={color} />
        </Pressable>
      </View>
    );
}

function VisibilityIcon({onVisibilityChanged}) {
    // FIXME: Toggle through icons 
    const theme = useTheme().colors;
    const [toggleState, setState] = useState(0);
    useEffect( () => {
        if (onVisibilityChanged) {
            switch(toggleState) {
            case 0: onVisibilityChanged("public"); break;
            case 1: onVisibilityChanged("home"); break;
            case 2: onVisibilityChanged("followers"); break;
            case 3: onVisibilityChanged("specified"); break;
            case 4: onVisibilityChanged("hidden"); break;
            }
        }
    }, [toggleState]);
    const color = theme.text;
    const icon = (st) => {
        switch (st){
        case 0:
            return <PostVisibility visibility="public" />
        case 1:
            return <PostVisibility visibility="home" />
        case 2:
            return <PostVisibility visibility="followers" />
        case 3:
            // FIXME: Need way to specify who
            return <PostVisibility visibility="specified" />
        case 4:
            // this doesn't seem to work. Need to look into the calckey code
            // to see what it means. For now, we only toggle through the
            // first 4. Change the `% 4` to `% 5` below to enable.
            return <PostVisibility visibility="hidden" />
        }
    }
    return (
      <View style={{flex: 1}}>
        <Pressable onPress={ () => setState((toggleState+1) % 4)}>
            {icon(toggleState)}
        </Pressable>
      </View>
    );
}
function PollPrompt({enabled, choices}) {
    const theme = useTheme().colors;
    if (!enabled) {
        return;
    }
    return <View><Text style={{color: theme.text}}>Poll Not implemented</Text></View>
}
function CWPrompt({enabled, value, setCW}) {
    const theme = useTheme();
    if (!enabled) {
        return;
    }
    return <TextInput 
                style={{padding: 2, margin: 2, borderColor: theme.border, borderWidth: 2, textAlignVertical: 'top', color: theme.colors.text}}
                value={value}
                onChangeText={setCW}
                placeholderTextColor={theme.dark ? "#777": "#999"}
                placeholder="CW Text"/>

}
export function PostModal({show, onClose, replyTo, replyContext}) {
    const author = useContext(AccountContext);
    const server = useContext(ServerContext);
    const theme = useTheme();
    const [pollAttached, setPollAttached] = useState(false);
    const [cwAttached, setCWAttached] = useState(false);
    const [cw, setCW] = useState('');
    const [content, setContent] = useState('');
    const [visibility, setVisibility] = useState('public');
    const api = useAPI();
    console.log('visibility', visibility);
    const postAuthor = (author && author.accountInfo) ?
            <View style={{flex: 3, height: 50}}>
                <PostAuthor user={author.accountInfo}
                          onProfileClick={() => {}} 
                 />
            </View> : <View />;
    
    return <Modal animationType="slide" style={{flex: 1}}
                visible={show}
                onRequestClose={() => onClose()}>
        <View style={{flex: 1, backgroundColor: theme.colors.background}}>
            <View style={{flex: 1, flexDirection: 'row'}}>
              {postAuthor}
              <View style={{flex: 1, flexDirection: 'column', marginTop: 10, paddingRight: 10, alignItems: 'flex-end'}}>
                  <VisibilityIcon onVisibilityChanged={setVisibility} />
              </View>
              <View style={{flex: 1, alignItems: 'center'}}>
                <Text style={{flex: 1, textAlign: 'right', color: theme.colors.text}}>Characters left: <Text style={{fontWeight: 'bold'}}>{server ? server.maxNoteTextLength - content.length: 'unknown'}</Text></Text>
              </View>
            </View>
            {replyContext}
            <ScrollView style={{flex: 1}}><MFM style={{flex: 2}} text={content} /></ScrollView>
            <PollPrompt enabled={pollAttached}/>
            <View style={{flex: 1, flexDirection: 'row', justifyContent: 'center', padding: 10}}>
                <CWIcon enabled={cwAttached} onPress={(newState) => setCWAttached(newState)} />
                <PollIcon enabled={pollAttached} onPress={(newState) => setPollAttached(newState)} />
                <AttachIcon />
            </View>
            <CWPrompt value={cw} setCW={setCW} enabled={cwAttached} />
            <TextInput multiline={true} 
                style={{flex: 2, padding: 2, margin: 2, borderColor: theme.colors.border, borderWidth: 2, textAlignVertical: 'top', color: theme.colors.text}}
                autoFocus={true}
                value={content}
                onChangeText={setContent}
                placeholderTextColor={theme.dark ? "#777": "#999"}
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
                    cw: cw,
                    visibility: visibility, 
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
        case 'hidden':
            return <Text>🤫</Text>;
        default:
        throw new Error('Unhandled visibility: ' + props.visibility);
    }
}
export function PostAuthor(props) {
    const theme = useTheme().colors;
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
                 <Text style={{color: theme.text}}>{props.user.name}</Text>
                 <Text style={{color: theme.text}}>{formatUsername(props.user)}</Text>
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
    const theme = useTheme();
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
      options.push(<MenuOption key="bookmark" onSelect={() => {
        api.call("notes/favorites/create", {
          noteId: props.PostId,
        }).then ( (json) => {
            //console.log(json);
            Alert.alert('Bookmarked post');
        }).catch( (e) => console.warn(e));
      }} text="Bookmark" />);
    }

    return (
        <Menu style={{flex: 1}}>
          <MenuTrigger style={{flex: 1, alignSelf: 'flex-end'}}>
            <Entypo name="dots-three-vertical" size={24} color={theme.dark == true ? '#777' : 'black'} />
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
    const theme = useTheme().colors;
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
        <Text style={[styles.postTime, {color: theme.text}]}>{timestr}</Text>
      </View>
    );
}

function useCW(cw, content, emojis, loadThread, onHashtag, onProfileClick) {
    const [CWMode, setCWMode] = useState(cw ? 'hide' : 'show');
    // console.log(cw, CWMode)

    if (CWMode == 'show') {
        if (content) {
            return (<View>
            <MFM onClick={loadThread}
                 onHashtagClicked={onHashtag}
                 text={content} emojis={emojis}
                loadProfile={onProfileClick}/> 
                {cw ? <View style={{marginTop: 10}}><Button onPress={() => setCWMode('hide')} title="Hide content"/></View> : <View />}
            </View>)
        }
        return '';
    }

    return <View>
        <MFM onClick={() => setCWMode('show')}
                text={'**CW:** ' + cw}
                emojis={emojis}
                />
                <View style={{marginTop: 10}}>
            <Button onPress={() => setCWMode('show')} title="Show content"/>
            </View>
        </View>
}
export function Post(props) {
    const navigation = useNavigation();
    const api = useAPI();
    const theme = useTheme().colors;
    const loadThread = useCallback( () => {
      if (navigation && navigation.push) {
        console.log("Pushing thread", props.noteid);
        navigation.push("Thread", { PostId: props.noteid});
      }
    }, [props.noteid]);
    const content = useCW(props.cw, props.text, props.emojis, loadThread, props.onHashtag, props.onProfileClick);
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
            containerStyle={{backgroundColor: '#aaa', margin: 10}}
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
                isMuted
            />;
            return <View key={i}><Text>Unhandled video type {file.type}</Text></View>;
        } else if (file.type.startsWith('image/')) {
            return <PostImage key={i} index={i} postImages={
                    props.content.files.map((file, i) => {
                        return { url: file.url }
                })}
                url={file.url} imageWidth={file.properties.width} imageHeight={file.properties.height} />;
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
                   <Text style={{color: theme.text, fontSize: 24, marginLeft: 5}}>{props.content.reactions[val]}</Text>
                 </View>
               );

           }
           return <View key={val} style={{flexDirection: 'row', flexWrap: 'nowrap', paddingRight: 20}}>
                        <Text style={{fontSize: 24}}>{val}</Text>
                        <Text style={{color: theme.text, fontSize: 24, marginLeft: 5}}>{props.content.reactions[val]}</Text>
                  </View>;
         })}
       </View>
       ) : <View />;
    const text = content; // props.text ? <MFM onClick={loadThread} onHashtagClicked={onHashtag} text={props.text} emojis={props.emojis} loadProfile={props.onProfileClick}/> : '';
    const poll = props.content.poll ? <Poll choices={props.content.poll.choices} expiresAt={props.content.poll.expiresAt} multiple={props.content.poll.multiple} noteid={props.noteid} /> : null;
    if (props.reply) {
        return (
          <View style={props.noBorder ? styles.postContainerNoBorder : [styles.postContainer, {borderColor: theme.border, backgroundColor: theme.card}]}>
            <Text style={{color: theme.text}}>{props.replyLabel || 'In reply to:'}</Text>
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
          <View style={props.noBorder ? styles.postContainerNoBorder : [styles.postContainer, {borderColor: theme.border, backgroundColor: theme.card}]}>
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
                  <Text style={{color: theme.text}}>Boosted by </Text>
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
    const theme = useTheme().colors;
    // console.log(p);
    if (p.text && p.renote) {
        // QT
        return <Post
                        cw={p.cw}
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
                cw={p.cw}
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
                  <Text style={{color: theme.text}}>Boosted by </Text>
                  <PostAuthor user={p.user} onProfileClick={props.onProfileClick}/>
                  <PostVisibility visibility={p.visibility} />
                </View>
                <Post uri={p.uri}
                    cw={p.cw}
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
                    cw={p.cw}
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
    borderStyle: 'solid',
    borderWidth: 2,
    padding: 10,
  },
  postContainerNoBorder: {
    flex: 1,
    padding: 10,
  },
  postMetaContainer: {
    flex: 1,
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
