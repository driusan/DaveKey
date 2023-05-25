import * as mfm from 'mfm-js';
import { StyleSheet, View, Text, Pressable, Image } from 'react-native';
import {memo, useContext, useMemo } from 'react';
import {AccountContext} from './Account';
import * as Linking from 'expo-linking';
// import { WebView } from 'react-native-webview';
import AutoHeightWebView from 'react-native-autoheight-webview'


function loadProfile(account, username, host, profileNav) {
    if (!account) {
        throw new Error('Invalid loadprofile call');
    }
    const url ='https://' + account.instance + '/api/users/search-by-username-and-host';
    fetch(url,
    {
          method: 'POST',
          headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
          },
          credentials: "omit",
          body: JSON.stringify({
              i: account.i,
              username: username,
              host: host,
          })
    })
    .then( (resp) => resp.json())
    .then( (json) => {
        if (json.length < 1) {
            console.error('No result for profile found');
            return;
        }
        profileNav(json[0].id);
    })
    .catch((e) => console.error(e));
}

function mfm2React2(_styles, emojis, account, profileNav) {
    const MFM2React = (node, i) => {
        switch (node.type) {
            case 'text':
                return <Text style={_styles} key={i}>{node.props.text}</Text>;
            case 'bold':
                return <Text key={i} style={styles.bold}>{node.children.map(mfm2React2({..._styles, ...styles.bold}, emojis, account, profileNav))}</Text>;
            case 'italic':
                return <Text key={i} style={styles.italic}>{node.children.map(mfm2React2({..._styles, ...styles.italic}), emojis, account, profileNav)}</Text>;
            case 'small':
                return <Text key={i} style={styles.small}>{node.children.map(mfm2React2({...styles.small, ..._styles}, emojis, account, profileNav))}</Text>;
            case 'mention':
                return <Pressable key={i} onPress={() => loadProfile(account, node.props.username, node.props.host, profileNav)}><Text key={i} style={styles.mention}>{node.props.acct}</Text></Pressable>;
            case 'unicodeEmoji':
                return <Text key={i} >{node.props.emoji}</Text>;
            case 'url':
                return <Pressable key={i} onPress={() => Linking.openURL(node.props.url)}><Text style={styles.url}>{node.props.url}</Text></Pressable>;
            case 'fn':
                return applyMFMfunc(node, i, _styles);
            case 'hashtag':
                return <Text key={i} style={styles.url}>#{node.props.hashtag}</Text>;
            case 'link':
                return <Pressable key={i} onPress={() => Linking.openURL(node.props.url)}><Text>{node.children.map(mfm2React2({..._styles, ...styles.url}, emojis, account, profileNav))}</Text></Pressable>;
            case 'quote':
                // FIXME: Style this better
                return <Text key={i} style={styles.quote}>{node.children.map(mfm2React2({..._styles, ...styles.quote}, emojis, account, profileNav))}{"\n\n"}</Text>;
            case 'emojiCode':
                if (emojis) {
                    for (const el of emojis) {
                        if (el.name == node.props.name) {
                            return <Image style={{width: 40, height: 40}} key={i} source={{uri: el.url}} />;
                        }
                    }
                }
                return <Text key={i}>:{node.props.name}:</Text>
            case 'inlineCode':
                return <Text key={i} style={styles.inlineCode}>{node.props.code}</Text>
            case 'blockCode':
                return <Text key={i} style={styles.blockCode}>{"\n"}{node.props.code}{"\n"}</Text>;
            case 'center':
                return <Text key={i} style={styles.center}>{node.children.map(mfm2React2({..._styles, ...styles.quote}, emojis, account, profileNav))}</Text>;
            default:
                    console.error(node);
                    throw new Error('Unhandled MFM type: ' + node.type);
        }
    }
    return MFM2React;
}

function applyMFMfunc(node, i, _styles) {
    if (node.type != 'fn') {
        throw new Error('applyMFMfunc on non-fn of type ' + node.type);
    }
    let newstyles;
    switch (node.props.name) {
    case 'flip':
        // FIXME: This should be the equivalent of inline-block.
        if (!node.props.args ||
            Object.keys(node.props.args).length === 0
             ) {
            return <Text style={styles.flipped} key={i}>{node.children.map(mfm2React2(_styles))}</Text>;
        }
        newstyles = {..._styles};
        if (node.props.args.v === true) {
            newstyles = {...newstyles, ...styles.flippedVertical};
        }
        if (node.props.args.h === true) {
            newstyles = {...newstyles, ...styles.flippedHorizontal};
        }
        return <Text style={newstyles} key={i}>{node.children.map(mfm2React2(_styles))}</Text>;
    case 'tada':
    case 'rainbow':
        // FIXME: Not actually handled, just prevent warnings
        return <Text key={i}>{node.children.map(mfm2React2(_styles))}</Text>;
    case 'x2':
        return <Text key={i} style={styles.x2}>{node.children.map(mfm2React2(_styles))}</Text>;
    default:
        console.warn('unhandled fn ' + node.props.name);
        return <Text key={i}>{node.children.map(mfm2React2(_styles))}</Text>;
    }
}

function MFM2HTML(mfmTree, emojis) {
    const node2HTML = (node) => {
        const children = node.children ? node.children.map(node2HTML) : '';
        switch(node.type) {
        case 'text':
          return "<span>" + node.props.text.replaceAll("\n", "<br />") + "</span>";
        case 'url': 
          return "<a href=\"#\" onclick=\"window.ReactNativeWebView.postMessage(JSON.stringify({type: 'openurl', url: '" + node.props.url + "'})); return false;\">" + node.props.url + "</a>";
        case 'link': 
          return "<a href=\"#\" onclick=\"window.ReactNativeWebView.postMessage(JSON.stringify({type: 'openurl', url: '" + node.props.url + "'})); return false;\">" + children + "</a>";
        case 'mention':
          return "<a href=\"#\" onclick=\"window.ReactNativeWebView.postMessage(JSON.stringify({type: 'openprofile', username: '" + node.props.username + "', host: '" + node.props.host + "'})); return false;\">" + node.props.acct + "</a>";
        case 'unicodeEmoji': return node.props.emoji;
        case 'hashtag': return '#' + node.props.hashtag;
        case 'bold':
           return "<b>" + children + "</b>";
        case 'italic':
           return "<i>" + children + "</i>";
        case 'small':
           return "<small>" + children + "</small>";
        case 'quote':
           return "<blockquote style=\"background: #ddd; margin: 1em; padding: 1em; margin-left: 0; display: block; border-left: 8px solid #222;\">" + children + "</blockquote>";
        case 'emojiCode':
          if (emojis) {
            for (const el of emojis) {
              if (el.name == node.props.name) {
                return "<img src=\"" + el.url + "\" width=40 height=40 />";
              }
            }
          }
          return "<span>:" + node.props.name + ":</span>";
        case 'inlineCode':
          return "<code style=\"display: inline-block; background: #ddd; padding: 0.5ex; \">" + node.props.code + "</code>";
        case 'blockCode':
          return "<code style=\"background: #ddd; margin: 1em; padding: 1em; margin-left: 0; white-space: pre; display: block;\">" + node.props.code + "</code>";
        case 'center':
          return "<center>" +children + "</center>";
        default:
            console.warn(node.type + ' not implemented');
            return '<div>' + node.type + ' Not Implemented</div>'
        }
    }
    const nodesAsHTML = mfmTree.map(node2HTML);
    return '<div>' + nodesAsHTML.join('') + '</div>';
}

const MemoWebView = memo(function MemoWebView(props) {
  return <AutoHeightWebView style={{flex: 1, width: '98%'}}
            onStartShouldSetResponder={(evt) => true}
            onMoveShouldSetResponder={(evt) => false}
            onResponderTerminationRequest={(evt) => true}
            onResponderRelease={(evt) => {
              console.log('release');
              if (props.onClick) {
                  console.log('onclick');
                  props.onClick();
              } else {
                  console.log(props);
                  console.log('no onclick');
              }
            }
           }
           onResponderReject={(evt) => {console.log('reect', evt)}}
           source={{
               html: props.html,
               baseUrl: 'https://' + props.instance,
           }}
           scalesPageToFit={false}
           onMessage={(ev) => {
               console.log('got ev', ev);
               const obj = JSON.parse(ev.nativeEvent.data);
               switch (obj.type) {
               case 'openurl':
                  Linking.openURL(obj.url);
                  break;
              case 'openprofile':
                  loadProfile(account, obj.username, obj.host, props.loadProfile);
                  return;
               default:
                   console.log('obj', obj);
               }
           }}
           originWhitelist={['*']} />
});
export default function MFM(props) {
    const account = useContext(AccountContext);
    const html = useMemo( () => {
       const mfmTree = mfm.parse(props.text);
       return MFM2HTML(mfmTree, props.emojis);
    }, [props.text, props.emojis]);
    return <View style={{flex: 1}}>
        <MemoWebView html={html} instance={account.instance} onClick={props.onClick}/>
        </View>;
    return <Text>{reactified}</Text>;
}


const styles = StyleSheet.create({
    mention: {
        color: '#00f',
    },
    url: {
        color: '#00f',
        textDecorationLine: 'underline',
    },
    bold: {
        fontWeight: 'bold',
    },
    italic: {
        fontStyle: 'italic',
    },
    small: {
        fontSize: 8,
    },
    x2: {
        fontSize: 23, // FIXME: Figure out default font size, multiply by 2
    },
    flipped: {
        transform: [{scaleX: -1}],
    },
    flippedHorizontal: {
        transform: [{scaleX: -1}],
    },
    flippedVertical: {
        transform: [{scaleY: -1}],
    },
    quote: {
        padding: 20,
        fontStyle: 'italic',
        color: '#555',
        borderStyle: 'solid',
        borderLeftWidth: 30,
        borderLeftColor: '#555',
    },
    center: {
        textAlign: 'center',
    },
    inlineCode: {
        backgroundColor: '#aaa',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#fff',
    },
    blockCode: {
        backgroundColor: '#aaa',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#000',

    },
});
