import * as mfm from 'mfm-js';
import { StyleSheet, View, Text, Pressable, Image } from 'react-native';
import {memo, useContext, useMemo, useState } from 'react';
import {AccountContext} from './Account';
import * as Linking from 'expo-linking';
import { useAPI } from './api';
// import { WebView } from 'react-native-webview';
import AutoHeightWebView from 'react-native-autoheight-webview'
import katex from 'katex';


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

function applyMFMfunc(callback, node) {
    if (node.type != 'fn') {
        throw new Error('applyMFMfunc on non-fn of type ' + node.type);
    }
    let content = node.children.map(callback()).join('');
    switch (node.props.name) {
    case 'flip':
        if (!node.props.args || Object.keys(node.props.args).length == 0) {
            return '<span style="display: inline-block; transform: scaleX(-1);">' + content + '</span>';
        }
        if (node.props.args.v) {
            content = '<span style="display: inline-block; transform: scaleY(-1);">' + content + '</span>';
        }
        if (node.props.args.h) {
            content = '<span style="display: inline-block; transform: scaleX(-1);">' + content + '</span>';
        }
        return content;
    case 'font':
        if (node.props.args.serif) {
            return '<span style="font-family: serif">' + content + '</span>';
        }
        if (node.props.args.monospace) {
            return '<span style="font-family: monospace">' + content + '</span>';
        }
        if (node.props.args.cursive) {
            return '<span style="font-family: cursive">' + content + '</span>';
        }
        if (node.props.args.fantasy) {
            return '<span style="font-family: fantasy">' + content + '</span>';
        }
        console.warn('Unhandled font family', node);
        return '<span>' + content + '</span>';
    case 'x2':
        return '<span style="font-size: 200%">' + content + '</span>';
    case 'x3':
        return '<span style="font-size: 400%">' + content + '</span>';
    case 'x4':
        return '<span style="font-size: 600%">' + content + '</span>';
    case 'blur':
        return '<span onclick="this.style.filter = (this.style.filter == \'none\' ? \'blur(6px)\' : \'none\')" style="filter: blur(6px); transition: filter .3s">' + content + '</span>';
    default:
        console.warn('unhandled fn ' + node.props.name);
        return '<span>' + content + '</span>';
    }
}

function node2HTML(callback, node) {
        const emojis=callback.emojis;
        const children = node.children ? node.children.map(callback()) : '';
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
        case 'hashtag': 
          return "<a href=\"#\" onclick=\"hash = true;window.ReactNativeWebView.postMessage(JSON.stringify({type: 'hashtag', hashtag: '" + node.props.hashtag + "'})); return false;\">#" + node.props.hashtag + "</a>";
        case 'bold':
           return "<b>" + children + "</b>";
        case 'italic':
           return "<i>" + children + "</i>";
        case 'mathInline':
            console.log(node.props);
           return "<span>" + katex.renderToString(node.props.formula, { throwOnError: false, output: 'mathml' }) + "</span>";
        case 'mathBlock':
           return "<div>" + katex.renderToString(node.props.formula, { throwOnError: false, output: 'mathml' }) + "</div>";
        case 'small':
           return "<small>" + children + "</small>";
        case 'quote':
           return "<blockquote style=\"background: #ddd; margin: 1em; padding: 1em; margin-left: 0; display: block; border-left: 8px solid #222;\">" + children + "</blockquote>";
        case 'emojiCode':
           console.log('emojis', emojis, node.props.name);
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
          return applyMFMfunc(callback, node);
        default:
            console.warn(node.type + ' not implemented');
            return '<div>' + node.type + ' Not Implemented</div>'
        }
    }
function MFM2HTML(mfmTree, emojis) {
    const nodeClosure = () => {
        return (node) => node2HTML(nodeClosure, node);
    };
    // We need emojis to be in a context that array.map can access
    // when the object being mapped on is the node and we can't adjust the calling parameters
    nodeClosure.emojis = emojis;
    const nodesAsHTML = mfmTree.map(nodeClosure());
    return '<body onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type: \'defaultclick\'})); return false;"}><div>' + nodesAsHTML.join('') + "</div></body>";
}

const MemoWebView = memo(function MemoWebView(props) {
  const [bubble,setBubble] = useState(true);
  return <AutoHeightWebView style={{flex: 1, width: '98%'}}
            onStartShouldSetResponder={(evt) => true}
            onMoveShouldSetResponder={(evt) => false}
            onResponderTerminationRequest={(evt) => true}
            onResponderRelease={(evt) => {
              return false;
            }}
           onResponderReject={(evt) => {console.log('reect', evt)}}
           source={{
               html: props.html,
               baseUrl: 'https://' + props.instance,
           }}
           scalesPageToFit={false}
           onMessage={(ev) => {
               console.log('got ev', ev);
               //ev.preventDefault();
               const obj = JSON.parse(ev.nativeEvent.data);
               switch (obj.type) {
               case 'openurl':
                  setBubble(false);
                  Linking.openURL(obj.url);
                  break;
              case 'openprofile':
                  setBubble(false);
                  loadProfile(props.account, obj.username, obj.host, props.loadProfile);
                  return;
              case 'hashtag':
                  setBubble(false);
                  props.onHashtagClicked(obj.hashtag);
                  return;
              case 'defaultclick':
                  if (bubble) {
                      if (props.onClick) {
                        props.onClick();
                      }
                  };
                  setBubble(true);
                  return;
               default:
                   //console.log('obj', obj);
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
        <MemoWebView html={html} account={account} instance={account.instance} onClick={props.onClick}
            onHashtagClicked={props.onHashtagClicked}

            />
        </View>;
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
