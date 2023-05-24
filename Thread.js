import { Text, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCalckeyAccount } from './Account';
import { useEffect, useState } from 'react';
import { Post } from './Posts';
import { useFocusEffect } from '@react-navigation/native';


export function Thread({navigation, route}) {
    const account = useCalckeyAccount();
    if (!route.params.PostId) {
        return <View><Text>Internal error. Can not render thread without PostId.</Text></View>;
    }
    // console.log('route', route);
    return (
    <SafeAreaView style={{flex: 1}}>
        <ScrollView>
            <RenderThread postId={route.params.PostId}
                account={account}
                onProfileClick={(profileId) => {
                    navigation.push("Profile", {ProfileId: profileId});
                }}/>
        </ScrollView>
    </SafeAreaView>
    );
}

export function RenderThread(props) {
    const api = props.account.api;
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
          <ConversationContext posts={conversation} />
          <Post uri={displayedPost.uri}
            text={displayedPost.text} 
            time={displayedPost.createdAt}
            author={displayedPost.user}
            content={displayedPost}
            noteid={displayedPost.id}
            visibility={displayedPost.visibility}
          />
          <ConversationContext posts={children} />
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
            content={post}
            noteid={post.id}
            visibility={post.visibility}
          />
        })}
      </View>
      );
}
