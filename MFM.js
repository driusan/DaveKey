import * as mfm from 'mfm-js';
import { StyleSheet, ScrollView, View, Text, Pressable, Image } from 'react-native';
import {memo, useContext, useMemo, useState } from 'react';
import {AccountContext} from './Account';
import * as Linking from 'expo-linking';
import { useAPI } from './api';
import { useNavigation, useTheme } from '@react-navigation/native';
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
    case 'jelly': {
        const speed = (node.props.args.speed || "1s")
        return '<span style="display: inline-block; animation: ' + speed + ' linear 0s infinite normal both running mfm-rubberBand;">' + content + '</span>';
    }
    case 'tada': {
        const speed = (node.props.args.speed || "1s")
        return '<span style="display: inline-block; font-size: 150%; animation: ' + speed + ' linear 0s infinite normal both running tada;">' + content + '</span>';
    }
    case 'jump': {
        const speed = (node.props.args.speed || "0.75s")
        return '<span style="display: inline-block; animation: ' + speed + ' linear 0s infinite normal both running mfm-jump;">' + content + '</span>';
    }
    case 'bounce': {
        const speed = (node.props.args.speed || "0.75s")
        return '<span style="display: inline-block; transform-origin: center bottom; animation: ' + speed + ' linear 0s infinite normal both running mfm-bounce;">' + content + '</span>';
    }
    case 'shake': {
        const speed = (node.props.args.speed || "0.5s")
        return '<span style="display: inline-block; transform-origin: center bottom; animation: ' + speed + ' ease 0s infinite normal none running mfm-shake;">' + content + '</span>';
    }
    case 'twitch': {
        const speed = (node.props.args.speed || "0.5s")
        return '<span style="display: inline-block; transform-origin: center bottom; animation: ' + speed + ' ease 0s infinite normal none running mfm-twitch;">' + content + '</span>';
    }
    case 'rainbow': {
        const speed = (node.props.args.speed || "1s")
        // without a colour hue-rotate won't work for some reason. red is arbitrary.
        return '<span style="display: inline-block; color: red; animation: ' + speed + ' linear 0s infinite normal none running mfm-rainbow;">' + content + '</span>';
    }
    case 'fade': {
        const speed = (node.props.args.speed || "1.5s")
        const direction = node.props.args.out ? 'alternate-reverse' : 'alternate';
        return '<span style="display: inline-block; animation: ' + speed + ' linear 0s infinite ' + direction + ' none running mfm-fade;">' + content + '</span>';

    }
    case 'rotate': {
        const deg = (node.props.args.deg || "90")
        if (node.props.args.x) {
            return '<span style="display: inline-block; transform-origin: center center; transform: perspective(128px) rotateX(' + deg + 'deg)">' + content + '</span>';
        }
        return '<span style="display: inline-block; transform-origin: center center; transform: rotate(' + deg + 'deg)">' + content + '</span>';
    }
    case 'position': {
        const x = node.props.args.x || "0";
        const y = node.props.args.y || "0";

        return '<span style="display: inline-block; transform: translateX(' + x + 'em) translateY(' + y + 'em)">' + content + '</span>';
    }
    case 'scale': {
        const x = node.props.args.x || "1";
        const y = node.props.args.y || "1";

        return '<span style="display: inline-block; transform: scale(' + x + ',' + y + ')">' + content + '</span>';
    }
    case 'fg':
        return '<span style="display: inline-block; color: #' + node.props.args.color + '">' + content + '</span>';
    case 'bg':
        return '<span style="display: inline-block; background-color: #' + node.props.args.color + '">' + content + '</span>';
    case 'crop':
        const topC = node.props.args.top || "0";
        const rightC = node.props.args.right || "0";
        const bottomC = node.props.args.bottom || "0";
        const leftC = node.props.args.left || "0";
        return '<span style="display: inline-block; clip-path: inset(' +
            topC + '% ' +
            rightC + '% ' +
            bottomC + '% ' +
            leftC + '%)">'
            + content + '</span>';
	case 'sparkle':
		const id = Math.random() * 10000;
        return '<span id="sparkle-' + id + '" style="display: inline-block">' + content + '</span><script>mksparkle(document.getElementById("sparkle-' + id + '"));</script>';
    case 'spin':
        const speed = (node.props.args.speed || "1.5s")
        let animation = 'mfm-spin';
        if (node.props.args.x)  {
            animation = 'mfm-spinX';
        } else if (node.props.args.y) {
            animation = 'mfm-spinY';
        }
        let direction = "normal";
        if (node.props.args.alternate) {
            direction = "alternate";
        } else if (node.props.args.left) {
            direction = "reverse";
        }
        return '<span style="display: inline-block; animation: ' + speed + ' linear 0s infinite ' + direction + ' none running ' + animation + ';">' + content + '</span>';
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
      case 'plain':
         return '<span>' + children + '</span>';
      default:
         console.warn(node.type + ' not implemented');
         return '<div>' + node.type + ' Not Implemented</div>'
        }
    }
function MFM2HTML(mfmTree, emojis, background, foreground) {
    const nodeClosure = () => {
        return (node) => node2HTML(nodeClosure, node);
    };
    // We need emojis to be in a context that array.map can access
    // when the object being mapped on is the node and we can't adjust the calling parameters
    nodeClosure.emojis = emojis;
    const nodesAsHTML = mfmTree.map(nodeClosure());
    const animations = `<style>
        @keyframes mfm-twitch {
                0% {
                        transform: translate(7px, -2px);
                }
                5% {
                        transform: translate(-3px, 1px);
                }
                10% {
                        transform: translate(-7px, -1px);
                }
                15% {
                        transform: translateY(-1px);
                }
                20% {
                        transform: translate(-8px, 6px);
                }
                25% {
                        transform: translate(-4px, -3px);
                }
                30% {
                        transform: translate(-4px, -6px);
                }
                35% {
                        transform: translate(-8px, -8px);
                }
                40% {
                        transform: translate(4px, 6px);
                }
                45% {
                        transform: translate(-3px, 1px);
                }
                50% {
                        transform: translate(2px, -10px);
                }
                55% {
                        transform: translate(-7px);
                }
                60% {
                        transform: translate(-2px, 4px);
                }
                65% {
                        transform: translate(3px, -8px);
                }
                70% {
                        transform: translate(6px, 7px);
                }
                75% {
                        transform: translate(-7px, -2px);
                }
                80% {
                        transform: translate(-7px, -8px);
                }
                85% {
                        transform: translate(9px, 3px);
                }
                90% {
                        transform: translate(-3px, -2px);
                }
                95% {
                        transform: translate(-10px, 2px);
                }
                to {
                        transform: translate(-2px, -6px);
                }
        }
        @keyframes mfm-rubberBand {
                0% {
                        transform: scaleZ(1);
                }
                30% {
                        transform: scale3d(1.25, .75, 1);
                }
                40% {
                        transform: scale3d(.75, 1.25, 1);
                }
                50% {
                        transform: scale3d(1.15, .85, 1);
                }
                65% {
                        transform: scale3d(.95, 1.05, 1);
                }
                75% {
                        transform: scale3d(1.05, .95, 1);
                }
                to {
                        transform: scaleZ(1);
                }
        }
        @keyframes tada {
                0% {
                        transform: scaleZ(1);
                }
                10%, 20% {
                        transform: scale3d(.9, .9, .9) rotate3d(0, 0, 1, -3deg);
                }
                30%, 50%, 70%, 90% {
                        transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg);
                }
                40%, 60%, 80% {
                        transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg);
                }
                to {
                        transform: scaleZ(1);
                }
        }
        @keyframes mfm-jump {
                0% {
                        transform: translateY(0);
                }
                25% {
                        transform: translateY(-16px);
                }
                50% {
                        transform: translateY(0);
                }
                75% {
                        transform: translateY(-8px);
                }
                to {
                        transform: translateY(0);
                }
        }
        @keyframes mfm-bounce {
                0% {
                        transform: translateY(0) scale(1);
                }
                25% {
                        transform: translateY(-16px) scale(1);
                }
                50% {
                        transform: translateY(0) scale(1);
                }
                75% {
                        transform: translateY(0) scale(1.5, .75);
                }
                to {
                        transform: translateY(0) scale(1);
                }
        }
        @keyframes mfm-shake {
                0% {
                        transform: translate(-3px, -1px) rotate(-8deg);
                }
                5% {
                        transform: translateY(-1px) rotate(-10deg);
                }
                10% {
                        transform: translate(1px, -3px) rotate(0);
                }
                15% {
                        transform: translate(1px, 1px) rotate(11deg);
                }
                20% {
                        transform: translate(-2px, 1px) rotate(1deg);
                }
                25% {
                        transform: translate(-1px, -2px) rotate(-2deg);
                }
                30% {
                        transform: translate(-1px, 2px) rotate(-3deg);
                }
                35% {
                        transform: translate(2px, 1px) rotate(6deg);
                }
                40% {
                        transform: translate(-2px, -3px) rotate(-9deg);
                }
                45% {
                        transform: translateY(-1px) rotate(-12deg);
                }
                50% {
                        transform: translate(1px, 2px) rotate(10deg);
                }
                55% {
                        transform: translateY(-3px) rotate(8deg);
                }
                60% {
                        transform: translate(1px, -1px) rotate(8deg);
                }
                65% {
                        transform: translateY(-1px) rotate(-7deg);
                }
                70% {
                        transform: translate(-1px, -3px) rotate(6deg);
                }
                75% {
                        transform: translateY(-2px) rotate(4deg);
                }
                80% {
                        transform: translate(-2px, -1px) rotate(3deg);
                }
                85% {
                        transform: translate(1px, -3px) rotate(-10deg);
                }
                90% {
                        transform: translate(1px) rotate(3deg);
                }
                95% {
                        transform: translate(-2px) rotate(-3deg);
                }
                to {
                        transform: translate(2px, 1px) rotate(2deg);
                }
        }
        @keyframes mfm-rainbow {
                0% {
                    filter: hue-rotate(0deg) contrast(150%) saturate(150%);
                }
                to {
                    filter: hue-rotate(360deg) contrast(150%) saturate(150%);
                }
        }
        @keyframes mfm-fade {
                0% {
                        opacity: 0;
                }
                to {
                        opacity: 1;
                }
        }
        @keyframes mfm-spin {
                0% {
                        transform: rotate(0);
                }
                to {
                        transform: rotate(360deg);
                }
        }
        @keyframes mfm-spinX {
                0% {
                        transform: perspective(128px) rotateX(0);
                }
                to {
                        transform: perspective(128px) rotateX(360deg);
                }
        }@keyframes mfm-spinY {
                0% {
                        transform: perspective(128px) rotateY(0);
                }
                to {
                        transform: perspective(128px) rotateY(360deg);
                }
        }
    </style>
	<template id="sparkle-star">
	 <span style="display: inline-block; position: relative; border: thin solid black;">
       <svg
			style="position: absolute; top: -32px; left: -32px"
			width=":width"
			height=":height"
			viewBox="0 0 :width :height"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				style="transform-origin: center; transform-box: fill-box"
				transform="translate(0, 0)"
				fill=":color"
				d="M29.427,2.011C29.721,0.83 30.782,0 32,0C33.218,0 34.279,0.83 34.573,2.011L39.455,21.646C39.629,22.347 39.991,22.987 40.502,23.498C41.013,24.009 41.653,24.371 42.354,24.545L61.989,29.427C63.17,29.721 64,30.782 64,32C64,33.218 63.17,34.279 61.989,34.573L42.354,39.455C41.653,39.629 41.013,39.991 40.502,40.502C39.991,41.013 39.629,41.653 39.455,42.354L34.573,61.989C34.279,63.17 33.218,64 32,64C30.782,64 29.721,63.17 29.427,61.989L24.545,42.354C24.371,41.653 24.009,41.013 23.498,40.502C22.987,39.991 22.347,39.629 21.646,39.455L2.011,34.573C0.83,34.279 0,33.218 0,32C0,30.782 0.83,29.721 2.011,29.427L21.646,24.545C22.347,24.371 22.987,24.009 23.498,23.498C24.009,22.987 24.371,22.347 24.545,21.646L29.427,2.011Z"
			>
				<animateTransform
					attributeName="transform"
					attributeType="XML"
					type="rotate"
					from="0 0 0"
					to="360 0 0"
					dur="200ms"
					repeatCount="1"
					additive="sum"
				/>
				<animateTransform
					attributeName="transform"
					attributeType="XML"
					type="scale"
					values="0; 1; 0"
					dur="200ms"
					repeatCount="1"
					additive="sum"
				/> 
			</path>
		</svg>
      </span>
	</template>
    <script>
    function mksparkle(el) {
	   const colors = ["#eb6f92", "#9ccfd8", "#f6c177", "#f6c177", "#f6c177"];
	   const addStar = () => {
		   const color = colors[Math.floor(Math.random() * colors.length)]
		   const sizeFactor = Math.random();
		   const size = 0.2 + (sizeFactor / 10) * 3; 
		   const dur = 1000 + sizeFactor * 1000;
		   const width = el.offsetWidth;
		   const height = el.offsetHeight;
		   const x = Math.random() * (width- 64);
		   const y = Math.random() * (height- 64);

		   const star = document.getElementById("sparkle-star").content.cloneNode(true);
		   const path = star.querySelector('path');
		   path.setAttribute('fill', color);
		   path.setAttribute('transform', "translate(" + x + "," + y + ")");

		   const svg = star.querySelector('svg'); // set width, height, viewbox
		   const [rotateTransform, scaleTransform] = star.querySelectorAll("animateTransform");

		   rotateTransform.setAttribute("dur", dur + "ms");
		   scaleTransform.setAttribute("dur", dur + "ms");
		   scaleTransform.setAttribute("values", "0; " + size + "; 0");
		   svg.setAttribute("width", width);
		   svg.setAttribute("height", height);
		   svg.setAttribute("viewBox", "0 0 " + width + " " + height);

		   svg.style.position = "absolute";
		   svg.style.left = el.offsetLeft;
		   svg.style.top = el.offsetTop;
		   el.parentNode.appendChild(svg);
		   window.setTimeout(function() {
			  el.parentNode.removeChild(svg);
		   }, dur - 100);
		   window.setTimeout(function() {
			  addStar();
		   },500 + Math.random() * 500);
		
	};
	addStar();
    }
    </script>
    `;
    return '<body style="color: ' + foreground + '" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type: \'defaultclick\'})); return false;"}>' + animations + '<div>' + nodesAsHTML.join('') + "</div></body>";
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

function NativeMFMNode({node, style, emojis, loadProfileFN}) {
    const t = useTheme();
    const theme = t.colors;
    const account = useContext(AccountContext);
    const navigation = useNavigation();
    switch (node.type) {
    case 'text': 
        return <Text style={style}>{node.props.text}</Text>;
    case 'bold':
        return node.children.map( (child, i) => <NativeMFMNode style={{...style, fontWeight: 'bold'}} key={i} node={child} loadProfileFN={loadProfileFN} />);
    case 'italic':
        return node.children.map( (child, i) => <NativeMFMNode style={{...style, fontStyle: 'italic'}} key={i} node={child} loadProfileFN={loadProfileFN} />);
    case 'mention':
        return <Text onPress={() => {
                console.log(loadProfile);
                loadProfile(account, node.props.username, node.props.host, loadProfileFN);
        }} style={{...style, color: theme.primary}}>{node.props.acct}</Text>;
    case 'unicodeEmoji':
        return <Text style={style}>{node.props.emoji}</Text>;
    case 'hashtag':
        return <Text onPress={() => {
            navigation.push("Hashtag", {Tag: node.props.hashtag})
        }} style={{...style, color: theme.primary}}>#{node.props.hashtag}</Text>;
    case 'url':
        return <Text onPress={() => {
            Linking.openURL(node.props.url);
        }} style={{...style, color: theme.primary}}>{node.props.url}</Text>;
    case 'link':
        return <Text onPress={() => {
            Linking.openURL(node.props.url);
        }} style={{...style, color: theme.primary}}>{node.children.map( (child, i) => <NativeMFMNode style={{...style, color: theme.primary}} key={i} node={child} loadProfileFN={loadProfileFN} />)}</Text>;
    case 'plain':
        return node.children.map( (child, i) => <NativeMFMNode style={{color: theme.text}} key={i} node={child} loadProfileFN={loadProfileFN} />);
    case 'inlineCode':
        const inlineStyle = t.dark
             ? { fontFamily: 'monospace', color: theme.text, backgroundColor: '#333'}
             : { fontFamily: 'monospace', color: theme.text, backgroundColor: '#ddd'}
        return <Text style={{...style, ...inlineStyle}}>{node.props.code}</Text>;
    case 'emojiCode':
        console.log('emojis', emojis, node.props.name);
        if (emojis) {
            for (const el of emojis) {
              if (el.name == node.props.name) {
                return <Image source={{uri: el.url}} style={{width: 40, height: 40}} />
              }
            }
          }
        return <Text style={{color: theme.text}}>:{node.props.name}:</Text>;
    default: throw new Error('Unhandled node type:' + node.type);
    }
}
function NativeMFM(props) {
    const theme = useTheme().colors;
    const mfmTree = mfm.parse(props.text);
    return <View style={{flex: 1, flexDirection: 'column'}}>
        <Text style={{color: theme.primary}}>Native</Text>
        <Pressable onPress={props.onClick}><View style={{flex: 1}}><Text>{mfmTree.map( (node, i) => <NativeMFMNode emojis={props.emojis} loadProfileFN={props.loadProfileFN} style={{color: theme.text}} key={i} node={node} />)}</Text></View></Pressable>
    </View>
}

function WebViewMFM(props) {
    const account = useContext(AccountContext);
    const theme = useTheme().colors;
    const html = useMemo( () => {
        if (!props.text) {
            return '<body></body>';
        }
       const mfmTree = mfm.parse(props.text);
       return MFM2HTML(mfmTree, props.emojis, theme.card, theme.text);
    }, [props.text, props.emojis]);
    return <View style={{flex: 1}}>
        <Text style={{color: theme.primary}}>WebView</Text>
        <MemoWebView html={html} account={account} instance={account.instance} onClick={props.onClick}
            onHashtagClicked={props.onHashtagClicked}

            />
        </View>;
}

export default function MFM(props) {
    switch (props.engine || '') {
    case 'native':
        return <NativeMFM {...props} loadProfileFN={props.loadProfile}/>;
    case 'webview':
        return <WebViewMFM {...props} />;
    default:
        if (canUseNativeMFM(props.text)) {
            return <NativeMFM {...props} loadProfileFN={props.loadProfile}/>;
        } else {
            return <WebViewMFM {...props} />;
        }
    }
}

export function canUseNativeMFM(text) {
    const mfmTree = mfm.parse(text);
    const isSupported = (node) => {
        switch(node.type) {
        case 'bold':
        case 'italic':
        case 'link':
        case 'plain':
            return node.children.reduce( (current, value) => {
                    return current && isSupported(value)
            }, true);
        case 'text':
        case 'url': 
        case 'mention':
        case 'unicodeEmoji':
        case 'hashtag': 
        case 'inlineCode':
        case 'emojiCode':
            return true;
        case 'mathInline':
        case 'mathBlock':
        case 'small':
        case 'quote':
        case 'inlineCode':
        case 'blockCode':
        case 'center':
        case 'fn':
        default:
         return false;
        }
    };
    return mfmTree.reduce( (current, value) => {
        return current && isSupported(value)
    }, true);
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
