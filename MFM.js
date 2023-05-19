import * as mfm from 'mfm-js';
import { StyleSheet, Text, Pressable, Image } from 'react-native';
import React from 'react';
import * as Linking from 'expo-linking';


/*
function mfm2React3(styles) {
    return (node, i) => {
        switch (node.type) {
            case 'text':
                return <Text style={styles} key={i}>{node.props.text}</Text>;
    }
}
*/
function mfm2React2(_styles, emojis) {
    const MFM2React = (node, i) => {
        switch (node.type) {
            case 'text':
            /*
                if (node.props.text.trim() == "") {
                    return <Text key={i} />;
                } 
                */
                return <Text style={_styles} key={i}>{node.props.text}</Text>;
            case 'bold':
                return <Text key={i} style={styles.bold}>{node.children.map(mfm2React2({..._styles, ...styles.bold}, emojis))}</Text>;
            case 'italic':
                return <Text key={i} style={styles.italic}>{node.children.map(mfm2React2({..._styles, ...styles.italic}), emojis)}</Text>;
            case 'small':
                return <Text key={i} style={styles.small}>{node.children.map(mfm2React2({...styles.small, ..._styles}, emojis))}</Text>;
            case 'mention':
                return <Pressable key={i} onPress={() => {
                    console.log(node);
                }}><Text key={i} style={styles.mention}>{node.props.acct}</Text></Pressable>;
            case 'unicodeEmoji':
                return <Text key={i} >{node.props.emoji}</Text>;
            case 'url':
                return <Pressable key={i} onPress={() => Linking.openURL(node.props.url)}><Text style={styles.url}>{node.props.url}</Text></Pressable>;
            case 'fn':
                return applyMFMfunc(node, i, _styles);
            case 'hashtag':
                return <Text key={i} style={styles.url}>#{node.props.hashtag}</Text>;
            case 'link':
                return <Pressable key={i} onPress={() => Linking.openURL(node.props.url)}><Text>{node.children.map(mfm2React2({..._styles, ...styles.url}, emojis))}</Text></Pressable>;
            case 'quote':
                // FIXME: Style this better
                return <Text key={i} style={styles.quote}>{node.children.map(mfm2React2({..._styles, ...styles.quote}, emojis))}{"\n\n"}</Text>;
            case 'emojiCode':
                for (const el of emojis) {
                    if (el.name == node.props.name) {
                        return <Image style={{width: 40, height: 40}} key={i} source={{uri: el.url}} />;
                    }
                }
                return <Text key={i}>:{node.props.name}:</Text>
            case 'center':
                return <Text key={i} style={styles.center}>{node.children.map(mfm2React2({..._styles, ...styles.quote}, emojis))}</Text>;
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
        console.log(node);
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
    default:
        console.warn('unhandled fn ' + node.props.name);
        return <Text key={i}>{node.children.map(mfm2React2(_styles))}</Text>;
    }
}

export default function MFM(props) {
    const mfmTree = mfm.parse(props.text);
    const reactified = mfmTree.map(mfm2React2({}, props.emojis));
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
    }
});
