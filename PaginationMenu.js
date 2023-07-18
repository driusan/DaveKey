import {useAPI, useAPIPaginator} from './api';
import {useTheme, useNavigation} from '@react-navigation/native';
import {useState, useEffect, useCallback} from 'react';
import {StyleSheet, Pressable, FlatList, View, Text, RefreshControl, Button} from 'react-native';
import {FlatListPost} from './Posts';

// done: hashtag
// lists
// antenna
// bookmarks
// search
//
// todo:
// clips
// channels 

function MenuItem({title, id, name, navname, idkey}) {
  const theme = useTheme().colors;
  const navigation = useNavigation();
  const pressCB = useCallback( () => {
      const params = {name: name};
      params[idkey] = id;


      navigation.push(navname, params);
  }, [id, name, navname, idkey]);

  return (
    <Pressable onPress={pressCB}>
        <View style={{
        backgroundColor: theme.card,
        padding: 10,
        margin: 10}}>
          <Text style={{color: theme.text}}>{name}</Text>
    </View></Pressable>
  );
}

export function PaginatedMenuPage({listendpoint, idkey, navname, renderItem}) {
    const api = useAPI();
    const [menus, setMenus] = useState([]);
    useEffect( () => {
        api.call(listendpoint).then(
            (json) => {
                setMenus(json);

            }
        );
    }, []);
    return <FlatList 
               data={menus}
               renderItem={
                  ({item}) => (renderItem ? renderItem(item) : <MenuItem {...item} idkey={idkey} navname={navname}/>)
               }
               ItemSeparatorComponent={
                   () => <View style={{padding: 5}} />
               }
        />
}


export function PaginatedPostList({endpoint, params, emptyMsg, extractNote}) {
    const theme = useTheme().colors;
    const posts = useAPIPaginator(endpoint, params);
    const [postModalVisible, setPostModalVisible] = useState(false);
    const [postReplyId, setPostReplyId] = useState(null);

  let refreshControl = <RefreshControl refreshing={posts.isRefreshing} onRefresh={posts.refresh} enabled={true}/>;
   if (posts.data === null) {
       return <View><Text style={{color: theme.primary}}>Loading..</Text></View>;
   }
   return (<View>
        <FlatList
           data={posts.data}
           renderItem={
              ({item}) =>  {
                const note = extractNote ? extractNote(item) : item;
                return <FlatListPost post={note} 
                          doReply={(postId) => { setPostReplyId(postId); setPostModalVisible(true); }}
                          onProfileClick={() => {}}
                   />
           }}
           ItemSeparatorComponent={
               () => <View style={{padding: 5}} />
           }
           ListEmptyComponent={<View style={styles.container}><Text style={[styles.header, {color: theme.primary}]}>{emptyMsg || 'No Content'}</Text></View>}
           ListFooterComponent={(posts.data && posts.data.length > 0) ? <Button title="Load more" onPress={posts.moreAfter} /> : <View />}

           refreshControl={refreshControl}
           stickyHeaderIndices={[0]}
           stickyHeaderHiddenOnScroll={true}
        />
      </View>);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexFlow: 'space-between',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    width: '100%',
  },
  header: {
    fontWeight: 'bold',
    fontSize: 20,
  },
});
