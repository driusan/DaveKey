import { Text, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCalckeyAccount } from './Account';
import { useEffect, useState } from 'react';
import { Post, PostModal } from './Posts';

export function Thread({navigation, route}) {
    const account = useCalckeyAccount();
    if (!route.params.PostId) {
        return <View><Text>Internal error. Can not render thread without PostId.</Text></View>;
    }
    // console.log('route', route);
    return (
        <ScrollView>
            <RenderThread postId={route.params.PostId}
                account={account}
                onProfileClick={(profileId) => {
                    navigation.push("Profile", {ProfileId: profileId});
                }}/>
        </ScrollView>
    );
}

export function RenderThread(props) {
    const api = props.account.api;
    const [replyTo, setReplyTo] = useState(null);
    const [displayedPost, setDisplayedPost] = useState(null);
    const [conversation, setConversation] = useState([]);
    const [children, setChildren] = useState([]);
    useEffect( () => {
        api('notes/show', {noteId: props.postId})
        .then( (json) => {
            setDisplayedPost(json);
        });
        api('notes/conversation', {noteId: props.postId})
        .then( (json) => {
            setConversation(json.reverse());
        });
        api('notes/children', {noteId: props.postId, depth: 12})
        .then( (json) => {
            // console.log(json);
            setChildren(json);
        });
    }, [props.postId, props.account]);
    if (!displayedPost) {
        return <View />;
    }
    return (
       <View style={{flex: 1}}>
          <PostModal show={replyTo != null} replyTo={replyTo} onClose={() => setReplyTo(null)} />
          <ConversationContext onProfileClick={props.onProfileClick} posts={conversation} />
          <View style={{flex: 1, borderColor: '#0af', borderWidth: 4}}>
          <Post uri={displayedPost.uri}
            cw={displayedPost.cw}
            text={displayedPost.text} 
            time={displayedPost.createdAt}
            author={displayedPost.user}
            doReply={setReplyTo}
            content={displayedPost}
            noteid={displayedPost.id}
            visibility={displayedPost.visibility}
            reactionEmojis={displayedPost.reactionEmojis}
            onProfileClick={props.onProfileClick}
          />
          </View>
          <ConversationContext onProfileClick={props.onProfileClick} doReply={setReplyTo} posts={children} />
       </View>
    );
}

function ConversationContext(props) {
    return (
      <View style={{flex: 1}}>
        {props.posts.map((post, i) => {
          return <Post uri={post.uri}
            key={i}
            text={post.text} 
            time={post.createdAt}
            author={post.user}
            doReply={props.doReply}
            content={post}
            noteid={post.id}
            reactionEmojis={post.reactionEmojis}
            visibility={post.visibility}
            onProfileClick={props.onProfileClick}
          />
        })}
      </View>
      );
}
