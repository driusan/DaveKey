import { StatusBar } from 'expo-status-bar';

import { StyleSheet, Text, View, TextInput, Button } from 'react-native';
import { WebView } from 'react-native-webview';
import React, {useState,useEffect} from 'react';
import * as Crypto from 'expo-crypto';

function GetAccessToken(props) {
  const [instance, setInstance] = useState('doomscroller.social');
  const [instanceSelected, setInstanceSelected] = useState(false);

  const [appSecret, setAppSecret] = useState(null);
  const [token, setToken] = useState(null);
  const [authURL, setAuthURL] = useState(null);
  const [authDone, setAuthDone] = useState(false);

  // get the app secret
  useEffect( () => {
      console.log('Getting app secret');
      if (!instance || instanceSelected) {
          return;
      }
      // get the app secret
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
            ],
            callbackUrl: 'https://' + instance + '/?loginsuccess=true',
         }),
      }).then((resp) => resp.json())
      .then((json) => {
          console.log('app secret', json);
          setAppSecret(json.secret);
      })
      .catch((error) => console.log('catch', error));
  }, [instance, instanceSelected]);

  // get the session token
  useEffect(() => {
      if (!instance || !instanceSelected) {
          return;
      }
      if (!appSecret) {
          return;
      }
      if (authURL) {
          return;
      }
      if (!instance || !instanceSelected) {
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
          console.log('got session', json);
          setToken(json.token);
          setAuthURL(json.url);
      }).catch((error) => console.error(error));
        
  }, [appSecret, instanceSelected]);
  useEffect(() => {
      console.log(appSecret, token, authDone);
      if (!instance || !instanceSelected) {
          return;
      }
      if (!appSecret || !token || !authDone) {
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
          // calculate i
          Crypto.digestStringAsync(
              Crypto.CryptoDigestAlgorithm.SHA256,
              json.accessToken + appSecret
          ).then( (val) => {
              console.log('xx', val, instance);
              props.onSuccess(val, instance);
              console.log(val);
              // setIToken(val);
          }).catch( (e) => {
              console.error(e);
          });
      }).catch((error) => console.error('userkey', error));
        
  }, [appSecret, token, authDone, instanceSelected]);
  if (authURL) {
      console.log(authURL, 'a');
      return <WebView source={{uri: authURL}}
            onNavigationStateChange={ (state) => {
                if (state.url.includes('?loginsuccess=true')) {
                    setAuthDone(true);
                }
                console.log(state);
            }}
          />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.instanceLabel}>Enter your instance name:</Text>
      <TextInput value={instance}
          onChangeText={setInstance}
          style={styles.instanceInput}
          placeholder="doomscroller.social"
          
      />
      <View style={styles.loginButton}>
        <Button title='Login' onPress={() => {
               setInstanceSelected(true);
        }} />
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
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
