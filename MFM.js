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

function applyMFMfunc(node, i, _styles) {
    if (node.type != 'fn') {
        throw new Error('applyMFMfunc on non-fn of type ' + node.type);
    }
    switch (node.props.name) {
    default:
        console.warn('unhandled fn ' + node.props.name);
        return '<span>' + node.children.map(node2HTML).join('') + '</span>';
    }
}

function node2HTML(node) {
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
      case 'fn':
          return applyMFMfunc(node);
        default:
            console.warn(node.type + ' not implemented');
            return '<div>' + node.type + ' Not Implemented</div>'
        }
    }
function MFM2HTML(mfmTree, emojis) {
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
