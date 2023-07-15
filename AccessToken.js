import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { StyleSheet, Text, View, TextInput, Button } from 'react-native';
import { WebView } from 'react-native-webview';
import React, {useRef, useState,useEffect} from 'react';
import * as Crypto from 'expo-crypto';
import { useTheme} from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import * as WebBrowser from 'expo-web-browser';


function useInstancePrompt() {
  const [instance, setInstance] = useState('');
  const [instanceSelected, setInstanceSelected] = useState(false);
  const theme = useTheme().colors;
  const themeName = useColorScheme();

  return {
      instance: instanceSelected ? instance : null,
      selected: instanceSelected,
      promptview: (<View style={[styles.container, {backgroundColor: theme.background}]}>
      <Text style={[styles.instanceLabel, {color: theme.primary}]}>Enter your instance name:</Text>
      <TextInput value={instance}
          onChangeText={setInstance}
          style={[styles.instanceInput, {color: theme.text, backgroundColor: theme.card}]}
          placeholder="calckey.social"
          placeholderTextColor={themeName == "dark" ? "#777": "#999"}
      />
      <View style={styles.loginButton}>
        <Button title='Login' onPress={() => {
               setInstanceSelected(true);
        }} />
      </View>
      <StatusBar style="auto" />
    </View>
    )
  };
}
function GetAccessToken(props) {
    return KeyGetAccessToken(props);
}

function useKeyAppSecret(instance) {
  const [appSecret, setAppSecret] = useState(null);

  useEffect( () => {
      if (!instance) {
          return;
      }
      // get the app secret
      //console.log('getting secret from', 'https://' + instance + "/api/app/create")
      fetch('https://' + instance + "/api/app/create",
      {
          method: 'POST',
          headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
          },
          credentials: "omit",
          body: JSON.stringify({
            name: "DaveKey",
            description: "Test app",
            permission: [
                "read:account",
                "write:account",
                "write:notes",
                "read:notifications",
                "write:reactions",
                "write:votes",
                "read:drive",
                "write:drive",
                "read:favorites",
                "write:favorites",
            ],
            callbackUrl: Linking.createURL('loginsuccess', {})//'https://' + instance + '/?loginsuccess=true',
         }),
      }).then((resp) => resp.json())
      .then((json) => {
          //console.log('app secret', json);
          setAppSecret(json.secret);
      })
      .catch((error) => console.log('catch', error));
  }, [instance]);
  return appSecret;
}

function useKeySession(instance, appSecret) {
  const [token, setToken] = useState(null);
  const [authURL, setAuthURL] = useState(null);
  const [authDone, setAuthDone] = useState(false);
  useEffect(() => {
      if (!instance) {
          //console.log('no instance');
          return;
      }

      if (!appSecret) {
          //console.log('no secret');
          return;
      }
      fetch('https://' + instance + "/api/auth/session/generate",
      {
          method: 'POST',
          headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
          },
          credentials: "omit",
          body: JSON.stringify({
            appSecret: appSecret,
         }),
      }).then((resp) => resp.json())
      .then((json) => {
          //console.log('got session', json);
          setToken(json.token);
          setAuthURL(json.url);
          Linking.addEventListener('url', (url) => {
              const u = Linking.parse(url.url);
              // gets parsed as hostname for a native eas build and path when
              // in the expo dev app
              if (u.path == 'loginsuccess' || u.hostname == 'loginsuccess') {
                  setAuthDone(true);
                  // causes an error when not on iOS
                  // WebBrowser.dismissBrowser();
              }
          });
          WebBrowser.openBrowserAsync(json.url);
      }).catch((error) => console.error(error));
        
  }, [instance, appSecret]);
  return authDone ? token : '';
}

function useKeyI(instance, appSecret, token) {
   const [i, setI] = useState(null);
   useEffect( () => {
       if (!instance || !appSecret || !token) {
           return;
       }
       fetch('https://' + instance + "/api/auth/session/userkey",
      {
          method: 'POST',
          headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
          },
          mode: "cors",
          credentials: "omit",
          body: JSON.stringify({
            appSecret: appSecret,
            token: token,
         }),
      }).then((resp) => resp.json())
      .then((json) => {
          //console.log('calcing i', json);
          // calculate i
          Crypto.digestStringAsync(
              Crypto.CryptoDigestAlgorithm.SHA256,
              json.accessToken + appSecret
          ).then( (val) => {
              setI(val);
          }).catch( (e) => {
              console.error(e);
          });
      }).catch((error) => console.error('userkey', error));
   }, [instance, appSecret, token]);
   return i;
}
function KeyGetAccessToken(props) {
  // const [authDone, setAuthDone] = useState(false);

  const instance = useInstancePrompt();
  const appSecret = useKeyAppSecret(instance.instance);
  const sessiontoken = useKeySession(instance.instance, appSecret);
  const i = useKeyI(instance.instance, appSecret, sessiontoken);
  useEffect( () => {
      if (instance && i) {
          //console.log('onsuccess', instance.instance, i);
          props.onSuccess(i, instance.instance);
      }
  }, [instance, i]);

  //console.log(appSecret, sessiontoken, i);

  return instance.promptview;
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
  instanceLabel: {
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
    width: '80%',
  },
  instanceInput: {
    borderStyle: 'solid',
    borderColor: 'black',
    borderWidth: 1,
    marginTop: 10,
    width: '80%',
    padding: 5,
  },
  loginButton: {
    width: '80%',
    marginTop: 10,
  },
});

export default GetAccessToken;
