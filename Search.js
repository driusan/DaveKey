import {useAPI} from './api';
import {useTheme, useNavigation} from '@react-navigation/native';
import {useState, useEffect, useCallback} from 'react';
import {useColorScheme, TextInput, StyleSheet, Pressable, FlatList, View, Text, Button} from 'react-native';
import {PaginatedMenuPage, PaginatedPostList} from './PaginationMenu';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();
function ActionsStack() {
  return (
    <Stack.Navigator screenOptions={{}}>
      <Stack.Screen options={{headerShown: false}} name="Search Menu" component={SearchMenuPage} />
      <Stack.Screen name="Search Results" options={({navigation, route}) => {
          const term = route.params?.term;
          return { title: term ? 'Results for ' + term: 'Search Results'};

      }} component={SearchPostsPage} />
    </Stack.Navigator>
  );
}

function SearchMenuPage({navigation, route}) {
  const [term, setTerm] = useState(route.params?.term);
  const theme = useTheme().colors;
  const themeName = useColorScheme();

  return (<View style={styles.container}>
    <TextInput value={term}
      onChangeText={setTerm}
      style={[styles.searchInput, {color: theme.text, borderWidth: 2, borderColor: theme.border, backgroundColor: theme.card}]}
      placeholder="fun loving cowwqas"
      placeholderTextColor={themeName == "dark" ? "#777": "#999"}
    />
      <View style={styles.searchButton}>
        <Button title='Search' onPress={() => {
            navigation.push("Search Results", { term: term});
        }} />
      </View>
  </View>);
}

function SearchPostsPage({navigation, route}) {
    const theme = useTheme().colors;
    console.log(route.params);
    const term= route.params?.term;
    if (!term) {
        return <View><Text>No search term provided.</Text></View>;
    }
    return <PaginatedPostList 
            endpoint={"notes/search"}
            params={{query: term}}
            emptyMsg="No results found."
        />;
}

export function SearchPage({navigation, route}) {
    return <ActionsStack />;
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
  searchLabel: {
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
    width: '80%',
  },
  searchInput: {
    borderStyle: 'solid',
    borderColor: 'black',
    borderWidth: 1,
    marginTop: 10,
    width: '80%',
    padding: 5,
  },
  searchButton: {
    width: '80%',
    marginTop: 10,
  },
}  )
