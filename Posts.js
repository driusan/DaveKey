import MFM from './MFM';
import { AntDesign } from '@expo/vector-icons'; 

import { Keyboard, KeyboardAvoidingView, Animated, Dimensions, FlatList, StyleSheet, Pressable, Text, TextInput, ScrollView, View, Image, Button, Alert, PanResponder, RefreshControl, ToastAndroid } from 'react-native';
import {useWindowDimensions} from 'react-native';
import { SegmentedButtons, RadioButton, Switch, Modal, Portal } from 'react-native-paper';
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
import { DatePickerModal, TimePickerModal } from 'react-native-paper-dates';
import {useDrive} from './Drive';


function PostImage({url, imageHeight, imageWidth, postImages}) {
    const [displayModal, setDisplayModal] = useState(false);
    const dims = Dimensions.get('window');
    return (<View>
        <Portal>
            <Modal visible={displayModal} animationType="fade" transparent={true}>
                <View style={{backgroundColor: 'rgba(0, 0, 0, 0.8)', height: dims.height, width: dims.width}}>
                   <ImageViewer 
                        onCancel={() => setDisplayModal(false)}
                        imageUrls={postImages}
                        saveToLocalByLongPress={false}
                        enableSwipeDown={true}
                        useNativeDriver={true}
                    />
                </View>
            </Modal>
        </Portal>
        <Pressable onPress={() => { console.log('pressed');setDisplayModal(true) }}>
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
        const textStyle = option.isVoted ? { fontWeight: 'bold', color: theme.primary} : {color: theme.text};
        return (
          <View style={{borderWidth: 1, padding: 5, margin: 2, borderColor: theme.border, backgroundColor: theme.background}}
            key={i}>
            <Pressable onPress={() => {
                // We were in a preview of the post page
                if (!noteid) {
                    return;
                }
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
function AttachIcon({files, setFiles}) {
    const dims = useWindowDimensions();
    const theme = useTheme().colors;
    const [enabled, setEnabled] = useState(false);
    const drive = useDrive();
    // FIXME: Colour should be based on if attachments exist
    const [showModal, setShowModal] = useState(false);
    const onModalDismiss = useCallback( () => { setShowModal(false)}, [setShowModal]);
    const color = Object.keys(files).length > 0 ? theme.primary : theme.text
    const imageSize = dims.width / 2;

    return (
      <View style={{flex: 1, justifyContent: 'flex-end', alignItems: 'center'}}>
        <Portal>
            <Modal
                visible={showModal}
                transparent={true}
                animationType="fade"
                onDismiss={onModalDismiss}
                    contentContainerStyle={{margin: 20, backgroundColor: theme.card, padding: 20}}
                >
                    <View style={{flexDirection: 'row', marginBottom: 15}}>
                        <Text style={{flex: 2, color: theme.text, fontSize: 20, fontWeight: 'bold', padding: 5}}>Select Media</Text>
                        <Button style={{flex: 1}} title="Done" onPress={onModalDismiss}/>
                    </View>
                    <FlatList data={drive.files}
                        numColumns={2}
                        renderItem={ ({item}) => { 
                            const isSelected = files[item.id] ? true : false;
                            const border = isSelected ? { borderColor: theme.primary, borderWidth: 2} : {}
                            return <Pressable style={{flex: 1}} onPress={ () => {
                                console.log(files, item.id);
                                const newSelectedFiles = {...files};
                                if (files[item.id]) {
                                    delete newSelectedFiles[item.id];
                                } else {
                                    newSelectedFiles[item.id] = item;
                                }
                                console.log(newSelectedFiles);
                                setFiles(newSelectedFiles);
                        }}><View style={{flex: 1, margin: 5, ...border}}>
                            <Image style={{width: '100%', flexGrow: 1}} height={imageSize} resizeMode="contain" source={{uri: item.thumbnailUrl}} /></View></Pressable>}}

                        ListFooterComponent={<Button title="Load more" onPress={files.moreAfter} />}
                        onEndReached={files.moreAfter}
                        onEndReachedThreshold={0.7}
                    />
            </Modal>
        </Portal>
        <Pressable onPress={ () => setShowModal(true)}>
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

function PollExpirySelect({onChange}) {
    const theme = useTheme();
    const [expiryType, setExpiryType] = useState('in');
    const [inExpiryUnit, setInExpiryUnit] = useState('days');
    const [inExpiryValue, setInExpiryValue] = useState("1");
    const [atExpiryModalState, setAtExpiryModalState] = useState('date');
    const [atExpiryDate, setAtExpiryDate] = useState(new Date());
    const atExpiryDateOnDismissModal = useCallback( () => {
        setAtExpiryModalState('done');
    }, [setAtExpiryModalState]);
    const atExpiryDateOnConfirmModal = useCallback( (params) => {
        setAtExpiryModalState('time');
        setAtExpiryDate(params.date)
    }, [setAtExpiryModalState, setAtExpiryDate]);
    const atExpiryTimeOnDismissModal = useCallback( () => {
        setAtExpiryModalState('done');
    }, [setAtExpiryModalState]);
    const atExpiryTimeOnConfirmModal = useCallback( (params) => {
        setAtExpiryModalState('done');
        const newDate = new Date(atExpiryDate.getTime());
        newDate.setHours(params.hours);
        newDate.setMinutes(params.minutes);
        newDate.setSeconds(0);
        setAtExpiryDate(newDate)
    }, [setAtExpiryModalState, atExpiryDate, setAtExpiryDate]);
    useEffect( () => {
        switch (expiryType) {
        case 'never': onChange({'type': 'never'}); return;
        case 'on': onChange({'type': 'on', date: atExpiryDate.getTime()}); return;
        case 'in': {
            // expiryAfter seems to be in milliseconds, so multiply by 1000
            const duration = parseInt(inExpiryValue, 10) * 1000; 
            switch(inExpiryUnit) {
            case 'min':
                onChange({'type': 'in', expireAfter: duration*60});
                return;
            case 'hour':
                onChange({'type': 'in', expireAfter: duration*60*60});
                return;
            case 'days':
                onChange({'type': 'in', expireAfter: duration*60*60*24});
                return;
            default:
                throw new Error('Invalid unit');
            }
            }
        default: throw new Error("Invalid expiryType: " + expiryType);
        }
    }, [expiryType, inExpiryUnit, inExpiryValue, atExpiryDate]);

    let subselect = null;
    switch(expiryType) {
        case 'never': break;
        case 'in': subselect = (
            <View style={{flexDirection: 'row', margin: 5}}>
                <View style={{width: '20%'}}>
                    <TextInput style={{flex: 1, borderColor: theme.colors.border, borderWidth: 2, color: theme.colors.text, textAlign: 'right', marginRight: 10, paddingRight: 3}} value={inExpiryValue} 
                        onChangeText={setInExpiryValue}
                    inputMode="numeric"/>
                </View>
                <View style={{width: '80%', flexDirection: 'row'}}>
                    <SegmentedButtons style={{flex: 1}} density="high" buttons={[{ value: 'min', label: 'minute(s)'}, {value: 'hour', label: 'hour(s)'}, { value: 'days', label: 'day(s)'}]} value={inExpiryUnit} onValueChange={setInExpiryUnit} />
                </View>
            </View>);
            break;
        case 'on': subselect = (
            <View>
                <DatePickerModal
                    locale="en"
                    mode="single"
                    visible={atExpiryModalState=='date'}
                    date={atExpiryDate}
                    onDismiss={atExpiryDateOnDismissModal}
                    onConfirm={atExpiryDateOnConfirmModal}
                    />
                <TimePickerModal
                    visible={atExpiryModalState=='time'}
                    onDismiss={atExpiryTimeOnDismissModal}
                    onConfirm={atExpiryTimeOnConfirmModal}
                 />
            <View style={{margin: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                <Text style={{color: theme.colors.text}}>{atExpiryDate.toLocaleDateString()} at {atExpiryDate.toTimeString()}</Text>
                <Pressable style={{marginLeft: 10}} onPress={() => setAtExpiryModalState('date')}><AntDesign name="edit" size={24} color={theme.colors.text} /></Pressable>
            </View></View>);
    }
    return <View>
        <View style={{flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap'}}>
            <View style={{width: '20%'}}>
                <Text style={{flex: 1, color: theme.colors.text}}>Expires</Text>
            </View>
            <View style={{width: '80%', flexDirection: 'row'}}>
                <SegmentedButtons style={{flex: 1}} density="high" buttons={[{ value: 'in', label: 'in'},{ value: 'on', label: 'on'}, {value: 'never', label: 'never'}]} value={expiryType} onValueChange={setExpiryType}/>
            </View>
        </View>
        {subselect}
    </View>
}
function PollPrompt({enabled, poll, setPoll}) {
    const theme = useTheme();
    const [isMultiple, setIsMultiple] = useState(false);
    if (!enabled) {
        return;
    }
    const withNewChoice = [...poll.choices, ""]
    return <View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={{color: theme.colors.text}}>Allow multiple choices</Text>
            <Switch value={poll.multiple} onValueChange={() => {
                setPoll({...poll, multiple: !poll.multiple});
            }} />
        </View>
        <PollExpirySelect onChange={(newval) => {
            switch(newval.type) {
                case 'in':
                    setPoll({multiple: poll.multiple, choices: poll.choices, expiredAfter: newval.expireAfter});
                    return;
                case 'on':
                    setPoll({multiple: poll.multiple, choices: poll.choices, expiresAt: newval.date});
                    return;
                case 'never':
                    setPoll({multiple: poll.multiple, choices: poll.choices});
                    return;
                default:
            }
            }}/>
        {withNewChoice.map( (choice, i) => {
                return <Textbox key={i}
                    style={{flex: 1}}
                    value={choice}
                    onChangeText={(val) => {
                        if (i == poll.choices.length) {
                                const newchoices = [...poll.choices, val];
                                setPoll({...poll, choices: newchoices});
                            } else {
                                let newchoices = [...poll.choices];
                                newchoices[i] = val;
                                setPoll({...poll, choices: newchoices});
                            }
                    }}
                    theme={theme}
                    placeholder={"Option " + (i+1)} />

                })}
    </View>;
}

function Textbox({style, value, onChangeText, placeholder, theme}) {
    return <TextInput 
                style={{padding: 2, margin: 2, borderColor: theme.colors.border, borderWidth: 2, textAlignVertical: 'top', color: theme.colors.text, backgroundColor: theme.colors.background, ...style}}
                value={value}
                onChangeText={onChangeText}
                placeholderTextColor={theme.dark ? "#777": "#999"}
                placeholder={placeholder}/>;
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

function SelectUserModal({show, onDismiss, onUserPress, selected}) {
    const theme = useTheme();
    const [username, setUsername] = useState('');
    const [host, setHost] = useState('');
    const [matches, setMatches] = useState(null);
    const api = useAPI();
    useEffect( () => {
        api.call("users/search-by-username-and-host", {username: username, host: host, limit: 5}).then( (json) => {
            setMatches(json);
        });
    }, [username, host]);
    return <View style={{justifyContent: 'center', alignItems: 'center', flex: 1}}>
        <Portal>
        <Modal
        visible={show}
        transparent={true}
        animationType="fade"
        onDismiss={onDismiss}
            contentContainerStyle={{margin: 20, backgroundColor: theme.colors.card, padding: 20}}
        >
            <View>
                <Text style={{color: theme.colors.text, fontSize: 20, fontWeight: 'bold', padding: 5}}>Select User</Text>
            </View>
            <View style={{flexDirection: 'row'}}>
                <Textbox style={{flex: 1}} placeholder="user" onChangeText={setUsername} value={username} theme={theme}/>
                <Text style={{color: theme.colors.text, fontSize: 16, fontWeight: 'bold'}}>@</Text>
                <Textbox style={{flex: 1}} value={host} onChangeText={setHost} theme={theme} placeholder="host" />
            </View>
            {matches != null ? <FlatList data={matches}
                                        renderItem={({item}) => {
                                            const isSelected = selected.filter( (user) => user.id == item.id).length > 0;
                                            const border = isSelected ? {
                                                borderWidth: 1,
                                                borderColor: theme.colors.primary,
                                                backgroundColor: theme.colors.primary
                                            } : { borderWidth: 0}
                                            
                                            return <View style={{flex: 1, ...border}} >
                                                     <PostAuthor theme={theme.colors} onProfileClick={onUserPress} user={item} />
                                                   </View>
                                        }
                                        }
                                   ListEmptyComponent={<View style={{flex: 1}}>
                                                          <Text style={{color: theme.colors.text, fontStyle: 'italic'}}>No matches.</Text>
                                                       </View>}
 
                    /> : null}
    </Modal></Portal></View>;
}
function Recipients({visibility, recipients, onUserAdd, onUserRemove}) {
    const theme = useTheme().colors;
    const [showModal, setShowModal] = useState(false);
    if (visibility !== 'specified') {
        return;
    }
    return (
      <View>
         <SelectUserModal show={showModal} onDismiss={() => setShowModal(false)}
            selected={recipients}
            onUserPress={(id, user) => { 
                if (recipients.filter( (user) => user.id == id).length === 0) {
                    onUserAdd(user);
                } else {
                    onUserRemove(user);
                }
            }}
            />
         <View>
            <View style={{flexDirection: 'row'}}>
                <View style={{flex: 1}}>
                    <Text style={{color: theme.text, fontWeight: 'bold'}}>Recipients</Text>
                </View>
                <View style={{flex: 3}}>
                  <View>
                    {recipients.map((user) => (
                        <View style={{flexDirection: 'row', margin: 2}}>
                           <Text key={user.id} style={{flex: 1,color: theme.primary}}>{formatUsername(user)}</Text>
                           <Pressable onPress={ () => {
                               onUserRemove(user);
                           }}>
                               <AntDesign style={{alignSelf: 'flex-end'}} name="deleteuser" size={24} color={theme.text} />
                           </Pressable>
                        </View>)
                        )}
                  </View>
                  <Pressable onPress={() => setShowModal(true)} style={{paddingTop: 5}}>
                    <AntDesign name="adduser" size={24} color={theme.text} />
                  </Pressable>
                </View>
            </View>
         </View>
      </View>);
}

function useKeyboard() {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () =>  setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);
  return isKeyboardVisible;
}
export function CreatePostPage({navigation, route}) {
    const author = useContext(AccountContext);
    const server = useContext(ServerContext);
    const theme = useTheme();
    const keyboardShowing = useKeyboard();
    const [isWriting, setIsWriting] = useState(true);
    const [pollAttached, setPollAttached] = useState(false);
    const [cwAttached, setCWAttached] = useState(false);
    const [cw, setCW] = useState('');
    const [content, setContent] = useState('');
    const [visibility, setVisibility] = useState('public');
    const [recipients, setRecipients] = useState([]);
    const [poll, setPoll] = useState({multiple: false, choices: []});
    const replyId = route.params?.replyId;
    const api = useAPI();
    const [selectedFiles, setSelectedFiles] = useState({})
    const postAuthor = (author && author.accountInfo) ?
            <View style={{height: 70, flex: 2}}>
                <PostAuthor user={author.accountInfo}
                          onProfileClick={() => {}} 
                 />
            </View> : <View />;
    
    const display = isWriting ? 
            <View style={{flex: 1, alignContent: 'stretch'}}
                contentContainerStyle={{justfyContent: 'stretch', alignContent: 'stretch'}}
            >
                <ScrollView style={{flex: 1}}>
                    <MFM style={{flex: 1}} text={content} />
                    <PollPrompt enabled={pollAttached} poll={poll} setPoll={setPoll}
                        modifyChoice={ (i, newval) => {
                        }}
                    />
                    {Object.keys(selectedFiles).map( (fileid, i) => <PostMediaFile key={i} file={selectedFiles[fileid]} />)}
                </ScrollView>
                <View style={{flexDirection: 'row', justifyContent: 'center', padding: 10}}>
                    <CWIcon enabled={cwAttached} onPress={(newState) => setCWAttached(newState)} />
                    <PollIcon enabled={pollAttached} onPress={(newState) => setPollAttached(newState)} />
                    <AttachIcon files={selectedFiles} setFiles={setSelectedFiles}/>
                </View>
                <CWPrompt value={cw} setCW={setCW} enabled={cwAttached} />
                <KeyboardAvoidingView style={{flexDirection: 'column', flex: 1}}>
                <TextInput multiline={true} 
                    style={{flex: 2, padding: 2, margin: 2, borderColor: theme.colors.border, borderWidth: 2, textAlignVertical: 'top', color: theme.colors.text}}
                    autoFocus={true}
                    value={content}
                    onChangeText={setContent}
                    placeholderTextColor={theme.dark ? "#777": "#999"}
                    placeholder="Say something"/>
                </KeyboardAvoidingView>
            </View>
     : (<ScrollView style={{flex: 5}}>
          <MFM style={{flex: 2}} text={content} />
          {pollAttached ? <Poll choices={poll.choices.map( (text, i) => {return { isVoted: false, text: text, votes: i};})} /> : null}
          {Object.keys(selectedFiles).map( (fileid, i) => <PostMediaFile key={i} file={selectedFiles[fileid]} />)}
        </ScrollView>)
    const actions = isWriting ? (
        <View>
            <Button title="Preview" onPress={ () => {
                setIsWriting(false);
            }}/>
        </View>
        ) : (
            <View style={{flex: 1, flexDirection: 'row', alignContent: 'stretch', borderWidth: 3}}>
            <View style={{flex: 1, padding: 3}}><Button title="Post" onPress={() => {
                if (content == '') {
                    Alert.alert('No content', 'Did you want to cancel instead of posting?');
                    return;
                }
                if (visibility === 'specified' && recipients.length == 0) {
                    Alert.alert('No recipients', 'Did you want to cancel instead of posting?');
                    return;
                }
                const params = {
                    text: content,
                    poll: null,
                    localOnly: false,
                    visibility: visibility, 
                };

                if (replyId) {
                    params['replyId']= replyId;
                }
                if (cwAttached) {
                    params['cw'] = cw;
                }
                if (pollAttached) {
                    if (!poll.choices || poll.choices.length == 0) {
                            Alert.alert('Missing poll', 'You have attached a poll but not defined any options. Bad user.');
                            return;
                    }
                    if (poll.choices.filter( (option) => (option == null || option == '')).length > 0) {
                        Alert.alert('Empty option', 'Poll must not have any empty options. Sorry.');
                        return;
                    }
                    if (poll.choices.length < 2) {
                        Alert.alert('Too few options', 'Poll must have at least 2 choices.');
                        return;
                    }
                    params['poll'] = poll;
                }
                if (visibility === 'specified') {
                    params['visibleUserIds'] = recipients.map( (user) => user.id);
                }
                const nFiles = Object.keys(selectedFiles).length;
                if (nFiles > 16) {
                    Alert.alert('Too many attachments', 'There is a limit of 16 files attached per post.');
                    return;
                }
                if (nFiles > 0) {
                    params['fileIds'] = Object.keys(selectedFiles);
                }

                api.call("notes/create", params).then(
                    () => {
                        ToastAndroid.showWithGravity('Posted', ToastAndroid.SHORT, ToastAndroid.TOP);
                        // Alert.alert('Posted');
                        navigation.goBack();
                    }
                ).catch( (e) => {
                    console.error(e);
                    Alert.alert('Could not post');
                    onClose();
                });
              }}/></View>
              <View style={{flex: 1, padding: 3}}><Button style={{flex: 1}} title="Edit" onPress={() => {
                  setIsWriting(true);
              }} /></View>
              </View>
        )
    return (
      <View style={{flex: 1}}>
        <View style={{flex: 1, backgroundColor: theme.colors.background}}>
            <View>
                <View style={{height: 70, flexDirection: 'row', borderColor: 'green', borderWidth: 1}}>
                  {postAuthor}
                  <View style={{flex: 1, flexDirection: 'column', marginTop: 10, paddingRight: 10, alignItems: 'flex-end'}}>
                      <VisibilityIcon onVisibilityChanged={setVisibility} />
                  </View>
                  <View style={{flex: 1, alignItems: 'center'}}>
                    <Text style={{flex: 1, textAlign: 'right', color: theme.colors.text}}>Characters left: <Text style={{fontWeight: 'bold'}}>{server ? server.maxNoteTextLength - content.length: 'unknown'}</Text></Text>
                  </View>
                </View>
            <Recipients recipients={recipients} 
                onUserAdd={(user) => setRecipients([...recipients, user])}
                onUserRemove={(user) => setRecipients(recipients.filter( (recip) => recip.id != user.id))}
                visibility={visibility} />
            </View>
            {display}
            {actions}
        </View>
      </View>
    );
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
    const theme = props.theme || useTheme().colors;
    return (
           <Pressable style={{flex: 2}} onPress={() => {
               if (props.onProfileClick) {
                   props.onProfileClick(props.user.id, props.user);
               } else {
                   console.error('No onProfileClick defined');
               }
           }}>
         <View style={{flexDirection: 'row', padding: 5, flex: 1}}>
               <View style={{paddingRight: 5, flex: 1}}>
                 <Image style={{width: 40, height: 40}}
                   source={{ uri: props.user.avatarUrl}}
                 />
               </View>
               <View style={{flex:2, flexDirection: 'column'}}>
                 <MFM text={props.user.name} emojis={props.user.emojis} />
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
    const navigation = useNavigation();
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
        api.call("notes/create", {
          renoteId: props.PostId,
          visibility: 'public',
        }).then ( (json) => {
            Alert.alert('Boosted post');
        });
      }} text="Boost" />);
      options.push(<MenuOption key="reply" onSelect={() => {
        navigation.push("Create Post", { replyId: props.PostId });
      }} text="Reply" />);
      options.push(<MenuOption key="like" onSelect={() => {
        api.call("notes/reactions/create", {
          noteId: props.PostId,
          reaction: server.defaultReaction || '⭐'
        }).then ( (json) => {
            Alert.alert('Liked post');
        }).catch( (e) => console.warn(e));
      }} text="Like" />);
      options.push(<MenuOption key="bookmark" onSelect={() => {
        api.call("notes/favorites/create", {
          noteId: props.PostId,
        }).then ( (json) => {
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

function PostMediaFile({file, siblings}) {
    const [isMuted, setIsMuted] = useState(true)
    if (file.type.startsWith('video/')) {
        return (<Video
            style={{flex: 1, height: 400}}
            source={{uri: file.url}}
            useNativeControls
            shouldPlay={true}
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            isMuted={isMuted}
        />);
    } else if (file.type.startsWith('image/')) {
        return (
           <PostImage postImages={(siblings || []).map((file, i) => { return { url: file.url } })}
              url={file.url}
              imageWidth={file.properties.width}
              imageHeight={file.properties.height}
           />);
    } else {
        return <View><Text>Unhandled attachment type {file.type}</Text></View>;
    }
}
export function Post(props) {
    const navigation = useNavigation();
    const api = useAPI();
    const theme = useTheme().colors;
    const loadThread = useCallback( () => {
      if (navigation && navigation.push) {
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

    // console.log('files', props.content.files);
    const images = props.content.files ? (
        <View style={{flex: 1}}>
        {props.content.files.map( (file, i) => {
              return <PostMediaFile key={i} file={file} siblings={props.content.files} />
        })}</View>
      ) : null;
    const reactions = props.content.reactions && Object.keys(props.content.reactions).length > 0 ? (
       <View style={{marginTop: 15, paddingTop: 5, borderStyle: 'dotted', borderTopColor: 'green', borderTopWidth: 2, flexDirection: 'row', flexWrap: 'wrap'}}>
         {Object.keys(props.content.reactions).map((val) => {
           if (val.startsWith(':') && val.endsWith(':')) {
               const emojiname = val.substr(1, val.length-2);

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
    const theme = useTheme().colors;
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
                files={p.files}
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
                    emojis={p.renote.emojis}
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
                files={p.files}
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
                    emojis={p.renote.emojis}
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
