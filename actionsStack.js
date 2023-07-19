import { DrawerActions } from '@react-navigation/native';
import { Alert, Linking, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { en, registerTranslation } from 'react-native-paper-dates'
import { SafeAreaView } from 'react-native-safe-area-context';
import  GetAccessToken from './AccessToken';
import { Button, FlatList, RefreshControl, Pressable, StyleSheet, Text, View } from 'react-native';
import {useState,useEffect, useCallback, useContext, useRef} from 'react';
import { FlatListPost, CreatePostPage, UserList} from './Posts';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { OtherProfile } from './Profile';
import {Thread} from './Thread';
import {PaginatedPostList} from './PaginationMenu';


const Stack = createNativeStackNavigator();

export function reuseableActionsStack() {
    // ActionsStack is only in the timeline view, these are the re-useable parts that might
    // be used on other pages in the navigation drawer
    return [
      <Stack.Screen key="profile" options={{headerShown: false}} name="Profile" component={OtherProfile} />,
      <Stack.Screen key="newpost" name="Create Post" component={CreatePostPage} 
        options={({navigation, route}) => {
            return {title: route.params?.replyId ? 'New reply' : 'New post'};
        }}
      />,
      <Stack.Screen key="thread" name="Thread" component={Thread} />,
      <Stack.Screen key ="hashtag" name="Hashtag" options={({navigation, route}) => {
          const tag = route.params?.Tag;
          return { title: tag ? '#' + tag : 'Hashtag'};
      }} component={HashtagPage} />,
    ];
}

function HashtagPage({navigation, route}) {
    const tag = route.params?.Tag;
    if (!tag) {
        return;
    }
    return <PaginatedPostList 
        endpoint="notes/search-by-tag"
        params={{tag: tag}}
    />;
}
