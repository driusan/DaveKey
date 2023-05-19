import {useState,useEffect, createContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AccountContext = createContext(null);

export function useCalckeyAccount() {
  const [accessToken, setAccessToken] = useState(null);
  const [instance, setInstance] = useState('');
  const [accountInfo, setAccountInfo] = useState(null);
  useEffect(() => {
      // Use stored account on first login.
      AsyncStorage.getItem('@i').then(setAccessToken);
      AsyncStorage.getItem('@instance').then(setInstance);
  }, []);
  useEffect(() => {
      // Fetch profile info after login
      if (!accessToken || !instance) {
          return;
      }
      const url = 'https://' + instance + "/api/i";
      fetch(url,
      {
          method: 'POST',
          headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
          },
          credentials: "omit",
          body: JSON.stringify({i: accessToken})
      }).then(
        resp => {
            if (!resp.ok) {
                // throw new Error("Response code was " + resp.status);
            }
            return resp.json()
        }
      ).then( (json) => {
          if (json.error) {
              throw new Error(json);
          }
          setAccountInfo(json);
          console.log('Loaded', url, json)
      }).catch( (e) => {
          console.error('error loading ', url);
          console.error(e)
      });
  }, [instance, accessToken]);


  return {
      i: accessToken,
      instance: instance,
      accountInfo: accountInfo,
      mentionName: () => {
          if (!accountInfo) {
              return '';
          }
          return '@' + accountInfo.username + '@' + instance;
      },
      login: (i, instance) => {
          setAccessToken(i);
          setInstance(instance);
          AsyncStorage.setItem('@i', i);
          AsyncStorage.setItem('@instance', instance);
      },
      logout: () => {
          setAccessToken(null);
          setInstance('');
          AsyncStorage.removeItem('@i');
          AsyncStorage.removeItem('@instance');
      }
  };
}
