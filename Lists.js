import {useAPI} from './api';
import {useTheme, useNavigation} from '@react-navigation/native';
import {useState, useEffect, useCallback} from 'react';
import {Pressable, FlatList, View, Text} from 'react-native';
import {PaginatedMenuPage, PaginatedPostList} from './PaginationMenu';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {reuseableActionsStack} from './actionsStack';

const Stack = createNativeStackNavigator();
function ActionsStack() {
  return (
    <Stack.Navigator screenOptions={{}}>
      <Stack.Screen options={{headerShown: false}} name="List Menu" component={ListMenuPage} />
      <Stack.Screen name="List" options={({navigation, route}) => {
          const name = route.params?.name;
          return { title: name ? name : 'List'};

      }} component={ListPostsPage} />
      {reuseableActionsStack()}
    </Stack.Navigator>
  );
}

function ListPostsPage({navigation, route}) {
    const theme = useTheme().colors;
    console.log(route.params);
    const listId= route.params?.listId;
    console.log(listId);
    if (!listId) {
        return <View><Text>Internal error. No listId.</Text></View>;
    }
    return <PaginatedPostList 
            endpoint={"notes/user-list-timeline"}
            params={{listId: listId}}
            emptyMsg={"Nothing in list " + route.params?.name}
        />;
}

function ListMenuPage() {
    return <PaginatedMenuPage listendpoint="users/lists/list"
                idkey="listId"
                navname="List" />
}
export function ListsPage({navigation, route}) {
    return <ActionsStack />;
}

