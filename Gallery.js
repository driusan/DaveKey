import {useAPI} from './api';
import {useTheme, useNavigation} from '@react-navigation/native';
import {useState, useEffect, useCallback} from 'react';
import {Pressable, FlatList, View} from 'react-native';
import {PaginatedMenuPage, PaginatedPostList} from './PaginationMenu';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Card, Button, Text } from 'react-native-paper';
import MFM from './MFM';
import ImageViewer from 'react-native-image-zoom-viewer';
import {useWindowDimensions} from 'react-native';


const Stack = createNativeStackNavigator();
function ActionsStack() {
  return (
    <Stack.Navigator screenOptions={{}}>
      <Stack.Screen options={{headerShown: false}} name="Gallery Menu" component={GalleriesMenuPage} />
      <Stack.Screen name="Gallery" options={({navigation, route}) => {
          const name = route.params?.name;
          return { title: name ? name : 'Gallery'};

      }} component={GalleryPage} />
    </Stack.Navigator>
  );
}
function GalleryPage({navigation, route}) {
    const api = useAPI();
    const {wheight, wwidth} = useWindowDimensions();


    const [gallery, setGallery] = useState(null);
    const theme = useTheme().colors;

    useEffect( () => {
        if (!route.params?.galleryId) {
            return;
        }
        api.call("gallery/posts/show", {postId: route.params?.galleryId}).then(
            (json) => {
                console.log(json);
                setGallery(json);
            }
        );
    }, [route.params?.galleryId]);

    if (!route.params?.galleryId) {
        return <View><Text style={{color: theme.text}}>Internal error. Missing gallery id.</Text></View>;
    }
    if (!gallery) {
        return <View><Text style={{color: theme.text}}>Loading gallery...</Text></View>;
        return <View><Text style={{}}>Internal error. Missing gallery id</Text></View>;
    }
    const urls = gallery.files.map( (file, i) => {
        console.log(i, file);
        return {
            url: file.url,
            /*width: file.properties.width,
            height: file.properties.height,
            */
        }
    });
    return <FlatList
              data={gallery ? gallery.files : []}
              HeaderComponent
              renderItem={ ({item}) => {
                const description = item.comment ? <Card.Content style={{marginTop: 15, width: wwidth}}><Text>{item.comment}</Text></Card.Content> : null;
                return (<Card style={{width: wwidth}}>
                        <Card.Title title={item.name}></Card.Title>
                        <Card.Cover source={{uri: item.url}} style={{width: wwidth}}/>
                        {description}
                    </Card>);
                }}
               ItemSeparatorComponent={
                   () => <View style={{padding: 5}} />
               }
                />;
    /*
    >View style={{flex: 1}}>{gallery.files.map((file, i) => {
            return (<Card>
                <Card.title title={file.name} />
            </Card>);
        })}</View>
    return <ImageViewer 
                style={{flex: 1}}
                onCancel={() => {}}
                imageUrls={urls}
                saveToLocalByLongPress={false}
                enableSwipeDown={false}
                useNativeDriver={true}
                enablePreload={true}
                footerContainerStyle={ {flex: 1, width: '100%', padding: 10, marginBottom: 10} }
                renderHeader={ (i) => <Text style={{color: theme.primary}}>{gallery.files[i]?.name}</Text>}
                renderFooter={ (i) => <MFM text={gallery.files[i]?.comment} />}
            />

                //renderFooter={ (i) => <View style={{padding: 10, backgroundColor: theme.background}}><Text>{gallery.files[i]?.comment || 'Abc'}</Text></View>}
    console.log(route.params);
    console.log('gallery', gallery);
    */

}

function GalleryMenuItem({item}) {
    const navigation = useNavigation();
    const pressCB = useCallback( () => {
          navigation.push("Gallery", { galleryId: item.id, name: item.title });
    }, [item.id]);
    return (
      <Card style={{margin: 5}} onPress={pressCB}>
         <Card.Title title={item.title} subtitle={item.createdAt} />
         <Card.Cover source={{ uri: item.files[0]?.url}} />

         <Card.Content style={{marginTop: 10}}>
            <MFM text={item.description} />
         </Card.Content>
      </Card>
    );
}
function GalleriesMenuPage() {
    return <PaginatedMenuPage listendpoint="i/gallery/posts"
                renderItem={(item) => <GalleryMenuItem item={item} />}
                idkey=""
                navname="Gallery" />
}
export function GalleriesPage({navigation, route}) {
    return <ActionsStack />;
}

