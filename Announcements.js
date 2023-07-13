import { Button, Image, FlatList, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import {useState, useEffect} from 'react';
import {useAPI} from './api';

export function AnnouncementsPage({navigation, route}) {
    const api = useAPI();
    const theme = useTheme().colors;
    const [announcements, setAnnouncements] = useState(null);
    const [forceRefresh, setForceRefresh] = useState(0);
    useEffect( () => {
        api.call("announcements", {}).then(
            (json) => {
                setAnnouncements(json);
            }
        );
            //    fetch('https://' + instance + "/api/announcements",
    }, [forceRefresh]);
    return <DisplayAnnouncements announcements={announcements} refresh={() => setForceRefresh(forceRefresh+1)}/>
}
function Announcement(props) {
    const theme = useTheme().colors;
    const api = useAPI();
    console.log(props);
    const image = props.imageUrl ? <View style={{padding: 10}}><Image style={{height: 200}} resizeMode="contain" source={{uri: props.imageUrl}} /></View> : <View />
    console.log(image);
    console
    const actions = props.isRead ? <View /> : <View>
        <Button title="Got it!" onPress={ () => {
            api.call("i/read-announcement", {announcementId: props.id}).then(
                () => props.refresh()
            );
        }}/>
    </View>
    return (
      <View style={{backgroundColor: theme.card, padding: 20, margin: 10}}>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 15, flexWrap: 'wrap'}}>
          <Text style={{...styles.header, color: theme.primary}}>{props.title}</Text>
          <Text style={{color: theme.text}}>{props.createdAt}</Text>
        </View>
        <Text style={{color: theme.text}}>{props.text}</Text>
        {image}
        {actions}
      </View>
    );
}
export function DisplayAnnouncements({announcements, refresh}) {
    const theme = useTheme().colors;
    if (announcements == null) {
        return <View style={styles.container}>
            <Text style={{color: theme.primary}}>Getting announcements from server...</Text>
        </View>
    }
    return <FlatList style={{padding: 10}} data={announcements}
        ListEmptyComponent={<View style={styles.container}>
            <Text style={{color: theme.primary}}>No announcements to display</Text>
        </View>}
        renderItem={({item}) => <Announcement {...item} refresh={refresh} />}
    />;
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
