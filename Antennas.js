import {useAPI} from './api';
import {useTheme, useNavigation} from '@react-navigation/native';
import {useState, useEffect, useCallback} from 'react';
import {Pressable, FlatList, View, Text} from 'react-native';
import {PaginatedMenuPage, PaginatedPostList} from './PaginationMenu';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();
function ActionsStack() {
  return (
    <Stack.Navigator screenOptions={{}}>
      <Stack.Screen options={{headerShown: false}} name="Antenna Menu" component={AntennasMenuPage} />
      <Stack.Screen name="Antenna" options={({navigation, route}) => {
          const name = route.params?.name;
          return { title: name ? name : 'Antenna'};

      }} component={AntennaPostsPage} />
    </Stack.Navigator>
  );
}

function AntennaPostsPage({navigation, route}) {
    const theme = useTheme().colors;
    console.log(route.params);
    const antennaId= route.params?.antennaId;
    console.log(antennaId);
    if (!antennaId) {
        return <View><Text>Internal error. No antennaId.</Text></View>;
    }
    return <PaginatedPostList 
            endpoint={"antennas/notes"}
            params={{antennaId: antennaId}}
            emptyMsg={"Nothing in antenna " + route.params?.name}
        />;
}

function AntennasMenuPage() {
    return <PaginatedMenuPage listendpoint="antennas/list"
                idkey="antennaId"
                navname="Antenna" />
}
export function AntennasPage({navigation, route}) {
    return <ActionsStack />;
}

