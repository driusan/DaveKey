import MFM from './MFM';
import { StyleSheet, Pressable, Text, View, Image, Button } from 'react-native';
import { LinkPreview } from '@flyerhq/react-native-link-preview';
import 'date-time-format-timezone';
import { formatUsername } from './utils';

// import RelativeTime from '@yaireo/relative-time'

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
function PostAuthor(props) {
    return (
         <View style={{flexDirection: 'row', padding: 5, flex: 1}}>
           <Pressable onPress={() => {
               console.log(props.user);
               if (props.onProfileClick) {
                   props.onProfileClick(props.user.id);
               } else {
                   console.error('No onProfileClick defined');
               }
           }}>
               <View style={{paddingRight: 5}}>
                 <Image style={{width: 40, height: 40}}
                   source={{ uri: props.user.avatarUrl}}
                 />
               </View>
               <View>
                 <Text>{props.user.name}</Text>
                 <Text>{formatUsername(props.user)}</Text>
               </View>
           </Pressable>
         </View>
    );
}

function PostContext(props) {
  if (!props.context) {
    return <View />;
  }

  const author = <PostAuthor user={props.context.user} onProfileClick={props.onProfileClick}/>;
  return (
    <View style={{flex: 1}}>
      <Post uri={props.context.uri}
        text={props.context.text} 
        time={props.context.createdAt}
        author={author}
        content={props.context}
        visibility={props.context.visibility}
      />
    </View>
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
          {props.author}
          <PostVisibility visibility={props.visibility} />
        </View>
        <Text style={styles.postTime}>{timestr}</Text>
      </View>
    );
}
export function Post(props) {
    // FIXME: Come up with a more robust regex
    const urlRE = /https?:\/\/[\w./\-?+]+/g;
    const thetext = props.text || ''
    const urls = [...thetext.matchAll(urlRE)];
    const previews = urls.map( (val, i) => {
        return <LinkPreview key={i} text={val[0]} 
            renderText={() => <View />}
        />;
    });

    const images = props.content.files ? (
      <View>
      {props.content.files.map((file, i) => {
        const height = file.properties.height > 400 ? 400 : file.properties.height;
        return <Image key={i}
                 source={{ uri: file.url}}
                 height={height}
                 resizeMode={'contain'}
                 resizeMethod={'resize'}
               />;
        })}
      </View> ): <View />;
    const reactions = props.content.reactions && Object.keys(props.content.reactions).length > 0 ? (
       <View style={{marginTop: 15, paddingTop: 5, borderStyle: 'dotted', borderTopColor: 'green', borderTopWidth: 2, flexDirection: 'row', flexWrap: 'wrap'}}>
         {Object.keys(props.content.reactions).map((val) => {
           // FIXME: Handle custom emojis
           return <View key={val} style={{flexDirection: 'row', flexWrap: 'nowrap', paddingRight: 20}}>
                        <Text style={{fontSize: 24}}>{val}</Text>
                        <Text style={{fontSize: 24}}>{props.content.reactions[val]}</Text>
                  </View>;
         })}
       </View>
       ) : <View />;
    const text = props.text ? <MFM text={props.text} emojis={props.emojis} loadProfile={props.onProfileClick}/> : '';
    if (props.reply) {
        return (
          <View style={styles.postContainer}>
            <Text>{props.replyLabel || 'In reply to:'}</Text>
            <PostContext context={props.reply} onProfileClick={props.onProfileClick}/>
            <PostHeader author={props.author}
                visibility={props.visibility}
                time={props.time}
            />
            {text}
            {images}
            {previews}
            {reactions}
          </View>
       );
    } else {
        return (
          <View style={styles.postContainer}>
            <PostHeader author={props.author}
                visibility={props.visibility}
                time={props.time}
            />
            {text}
            {images}
            {previews}
            {reactions}
          </View>
       );
    }
}

export function PostList(props) {
    const posts = props.withBoosts ? props.posts : props.posts.filter((p) => {
        return p.text !== null;
    });
    return (
      <View style={styles.flexer}>
      {posts.map((p, i) => {
          // FIXME: Move this logic into <Post />?
        if (p.text && p.renote) {
            // QT
            const author = <PostAuthor user={p.user}
                              onProfileClick={props.onProfileClick} 
                           />;
            return <Post key={i}
                        uri={p.uri}
                        text={p.text} 
                        time={p.createdAt}
                        content={p}
                        author={author}
                        visibility={p.visibility}
                        reply={p.renote}
                        replyLabel={'RE:'}
                        emojis={p.emojis}
                        onProfileClick={props.onProfileClick} 
                    />;
        } else if (p.text && !p.renote) {
            // Plain post
            const author = <PostAuthor user={p.user}
                              onProfileClick={props.onProfileClick} 
                           />;
            return <Post 
                key={i}
                uri={p.uri}
                text={p.text} 
                time={p.createdAt}
                content={p}
                author={author}
                visibility={p.visibility}
                reply={p.reply}
                emojis={p.emojis}
                onProfileClick={props.onProfileClick} 
            />;
        } else if (!p.text && p.renote) {
            // boost
            const author = <PostAuthor user={p.renote.user}
                              onProfileClick={props.onProfileClick} 
                           />;
            return (
              <View key={i}
                    style={styles.postContainer}>
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
                    time={p.createdAt}
                    author={author}
                    content={p}
                    visibility={p.renote.visibility}
                    emojis={p.emojis}
                    onProfileClick={props.onProfileClick} 
                />
              </View>
           );
        } else { // !text !renote.. nothing?
            if (p.files) {
                // no text, but had file or image attached. Treat it as a post
                const author = <PostAuthor user={p.renote.user}
                                  onProfileClick={props.onProfileClick} 
                               />;
                return <Post key={i}
                    uri={p.uri}
                    text={p.text} 
                    time={p.createdAt}
                    content={p}
                    author={author}
                    visibility={p.visibility}
                    reply={p.reply}
                    emojis={p.emojis}
                    onProfileClick={props.onProfileClick} 
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
